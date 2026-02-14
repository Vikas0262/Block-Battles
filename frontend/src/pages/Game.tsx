import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSocket, disconnectSocket, getSessionId, clearSessionId } from '../services/socketService';

interface GridBlock {
  blockId: number;
  owner: string | null;
  color: string;
  userName: string | null;
  claimedAt: number | null;
}

interface GridUser {
  id: string;
  name: string;
  color: string;
  blocksOwned: number;
  joinedAt: number;
}

const GRID_SIZE = 10;

export const Game: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useUser();
  const [grid, setGrid] = useState<GridBlock[]>([]);
  const [users, setUsers] = useState<GridUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [isClaming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<GridUser[]>([]);

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Initialize socket connection
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('gridState', (data: any) => {
      setGrid(data.grid);
      setUsers(data.users);
      setIsLoading(false);
    });

    socket.on('blockClaimed', (data: any) => {
      setGrid((prevGrid) =>
        prevGrid.map((block) =>
          block.blockId === data.blockId
            ? {
                ...block,
                owner: data.owner,
                color: data.color,
                userName: data.userName,
                claimedAt: data.claimedAt,
              }
            : block
        )
      );
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === data.owner ? { ...u, blocksOwned: u.blocksOwned + 1 } : u
        )
      );
      setIsClaiming(false);
      setSelectedBlockId(null);
    });

    socket.on('claimError', (data: any) => {
      setClaimError(data.message);
      setIsClaiming(false);
      setTimeout(() => setClaimError(null), 3000);
    });

    socket.on('claimSuccess', () => {
      setClaimError(null);
    });

    socket.on('userJoined', (data: any) => {
      setUsers((prevUsers) => {
        // Check if user already exists (prevent duplicates)
        const userExists = prevUsers.some(u => u.id === data.userId);
        if (userExists) {
          return prevUsers;
        }
        return [...prevUsers, {
          id: data.userId,
          name: data.userName,
          color: data.color,
          blocksOwned: 0,
          joinedAt: Date.now(),
        }];
      });
    });

    socket.on('userReconnected', (data: any) => {
      // Remove old socket ID and add new one
      setUsers((prevUsers) => {
        const filtered = prevUsers.filter(u => u.id !== data.oldUserId);
        const userExists = filtered.some(u => u.id === data.newUserId);
        if (userExists) {
          return filtered;
        }
        return [...filtered, {
          id: data.newUserId,
          name: data.userName,
          color: data.color,
          blocksOwned: data.blocksOwned || 0,
          joinedAt: Date.now(),
        }];
      });
    });

    socket.on('userDisconnected', (data: any) => {
      setUsers((prevUsers) => prevUsers.filter((u) => u.id !== data.userId));
      setGrid((prevGrid) =>
        prevGrid.map((block) =>
          block.owner === data.userId
            ? { ...block, owner: null, color: '#1a1a2e', userName: null, claimedAt: null }
            : block
        )
      );
    });

    socket.on('leaderboard', (data: any) => {
      setLeaderboard(data);
    });

    // Emit userJoin or reconnect to register with backend
    const sessionId = getSessionId();
    const userPayload = { userName: user?.userName || '', sessionId };
    
    if (user && socket.connected) {
      socket.emit('userJoin', userPayload);
    } else if (user && !socket.connected) {
      socket.once('connect', () => {
        socket.emit('userJoin', userPayload);
      });
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('gridState');
      socket.off('blockClaimed');
      socket.off('claimError');
      socket.off('claimSuccess');
      socket.off('userJoined');
      socket.off('userReconnected');
      socket.off('userDisconnected');
      socket.off('leaderboard');
    };
  }, [user]);

  // Deduplicate users list to prevent showing same user multiple times
  useEffect(() => {
    setUsers((prevUsers) => {
      const seen = new Map();
      const deduplicated = [];
      
      // Keep the latest entry for each unique name
      for (let i = prevUsers.length - 1; i >= 0; i--) {
        const user = prevUsers[i];
        if (!seen.has(user.name)) {
          seen.set(user.name, true);
          deduplicated.unshift(user);
        }
      }
      
      return deduplicated.length !== prevUsers.length ? deduplicated : prevUsers;
    });
  }, [users.length]);

  const handleBlockClick = useCallback(
    (blockId: number) => {
      if (isClaming) return;

      const block = grid[blockId];
      if (block?.owner === null) {
        setIsClaiming(true);
        setSelectedBlockId(blockId);
        const socket = getSocket();
        socket.emit('claimBlock', { blockId });
      } else {
        setClaimError(`Already claimed by ${block?.userName}`);
        setTimeout(() => setClaimError(null), 3000);
      }
    },
    [grid, isClaming]
  );

  const handleLeaderboard = useCallback(() => {
    const socket = getSocket();
    socket.emit('getLeaderboard');
    setShowLeaderboard(!showLeaderboard);
  }, [showLeaderboard]);

  const handleLogout = () => {
    clearSessionId(); // Clear session on logout
    disconnectSocket();
    clearUser();
    navigate('/');
  };

  const currentUserBlocks = useMemo(() => {
    return grid.filter((block) => block.owner === user?.userId).length;
  }, [grid, user?.userId]);

  if (!user) return null;

  // Show loading screen while waiting for grid data
  if (isLoading || grid.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-black text-white overflow-x-hidden flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        {/* Animated background elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-600 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-10 animate-pulse"></div>
        </div>

        {/* Loading Content */}
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-blue-600 mx-auto mb-4 shadow-lg flex items-center justify-center animate-bounce">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2" style={{ fontWeight: '300' }}>Initializing Battle Grid</h2>
          <p className="text-gray-400" style={{ fontWeight: '100' }}>Loading game state...</p>
          <div className="mt-8 flex justify-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-black text-white overflow-x-hidden" style={{ backgroundColor: '#0A0A0A' }}>
      

      {/* Top Bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/10 shadow-2xl" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-blue-600 flex items-center justify-center font-bold text-lg shadow-lg">
                  ⚡
                </div>
                <span className="text-xl font-bold">GridWars</span>
              </div>

              {/* Player Info */}
              <div className="flex items-center gap-3 ml-6 pl-6 border-l border-white/20">
                <div
                  className="w-10 h-10 rounded-lg shadow-lg border-2 border-white/30"
                  style={{ backgroundColor: user.color }}
                />
                <div>
                  <p className="font-semibold text-sm">{user.userName}</p>
                  <p className="text-xs text-gray-400">
                    <span className="text-purple-400 font-bold">{currentUserBlocks}</span> blocks
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/20 backdrop-blur">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                  }`}
                />
                <span className="text-sm font-medium">{isConnected ? 'Online' : 'Offline'}</span>
              </div>

              {/* Leaderboard */}
              <button
                onClick={handleLeaderboard}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 border border-yellow-500/30 transition-all duration-200 font-medium hover:border-yellow-500/50 shadow-lg hover:shadow-xl"
              >
                🏆 Top 10
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-all duration-200 text-red-300 hover:text-red-200 font-medium shadow-lg hover:shadow-xl"
              >
                ✕ Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Grid Area */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-8 shadow-2xl hover:shadow-2xl transition-shadow duration-300" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}>
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent" style={{ fontWeight: '300' }}>
                  BATTLE GRID
                </h2>
                <p className="text-gray-400 text-sm mt-2" style={{ fontWeight: '100' }}>Claim cells to expand your territory (10×10 = 100 cells)</p>
              </div>

              {/* Error Message */}
              {claimError && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/40 text-red-300 text-sm animate-slide-up font-medium shadow-lg">
                  ⚠️ {claimError}
                </div>
              )}

              {/* Grid Container */}
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-950/80 rounded-3xl overflow-hidden border-2 border-purple-500/20 shadow-2xl p-6" style={{ aspectRatio: '1 / 1', backgroundColor: 'rgba(15, 15, 35, 0.95)', minHeight: '600px' }}>
                <div
                  className="w-full h-full grid auto-rows-fr"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                  }}
                >
                  {grid.map((block) => (
                    <button
                      key={block.blockId}
                      onClick={() => handleBlockClick(block.blockId)}
                      className="group relative rounded-lg transition-all duration-300 font-bold text-sm overflow-hidden focus:outline-none active:scale-95 hover:scale-110 shadow-lg hover:shadow-2xl"
                      style={{
                        backgroundColor: block.color,
                        boxShadow: block.owner
                          ? `0 0 40px ${block.color}dd, inset 0 3px 6px rgba(255, 255, 255, 0.4), 0 16px 32px rgba(0, 0, 0, 0.7)`
                          : '0 10px 20px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.1)',
                        cursor: block.owner ? 'default' : 'pointer',
                        transform: selectedBlockId === block.blockId ? 'scale(1.2)' : 'scale(1)',
                        border: block.owner ? `3px solid rgba(255, 255, 255, 0.7)` : `2px solid rgba(100, 100, 120, 0.8)`,
                        opacity: block.owner ? 1 : 0.8,
                        filter: block.owner ? 'brightness(1.1)' : 'brightness(0.98)',
                        minHeight: '40px',
                      }}
                      title={block.owner ? `${block.userName}'s cell` : 'Click to claim'}
                      disabled={isClaming && selectedBlockId === block.blockId}
                    >
                      {/* Unclaimed - show texture */}
                      {!block.owner && (
                        <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity" style={{
                          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1)), linear-gradient(135deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1))',
                          backgroundSize: '6px 6px',
                          backgroundPosition: '0 0, 3px 3px',
                        }} />
                      )}

                      {/* Claimed - show owner initial */}
                      {block.owner && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent opacity-80" />
                          <span className="relative z-10 text-center text-white drop-shadow-2xl font-black text-lg group-hover:text-white transition-colors" style={{
                            textShadow: '0 3px 6px rgba(0, 0, 0, 0.9), 0 0 12px rgba(0, 0, 0, 0.6)',
                          }}>
                            {block.userName?.substring(0, 1).toUpperCase()}
                          </span>
                        </>
                      )}

                      {/* Hover glow effect */}
                      {!block.owner && (
                        <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent group-hover:from-white/35 group-hover:to-white/10 transition-all duration-300 rounded-lg" />
                      )}

                      {/* Claiming animation */}
                      {selectedBlockId === block.blockId && (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/60 to-white/30 rounded-lg" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Leaderboard Panel */}
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-4 shadow-2xl" style={{ backgroundColor: 'rgba(20, 20, 20, 0.7)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent" style={{ fontWeight: '300' }}>
                  {showLeaderboard ? '🏆 TOP' : '👥 PLAYERS'}
                </h3>
                <button
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {showLeaderboard ? 'All' : 'Top'}
                </button>
              </div>

              <div className="space-y-2 lg:max-h-96 lg:overflow-y-auto pr-1 custom-scrollbar">
                {(showLeaderboard ? leaderboard : users)
                  .sort((a, b) => b.blocksOwned - a.blocksOwned)
                  .map((u, idx) => (
                    <div
                      key={u.id}
                      className={`p-2.5 rounded-xl transition-all duration-200 ${
                        u.id === user?.userId
                          ? 'bg-gradient-to-r from-purple-500/40 to-blue-500/40 border-2 border-purple-400 ring-2 ring-purple-400/30'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {showLeaderboard && (
                          <span className={`text-sm font-black w-5 flex-shrink-0 ${
                            idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-500'
                          }`}>
                            #{idx + 1}
                          </span>
                        )}
                        <div
                          className="w-3 h-3 rounded-md flex-shrink-0 shadow-lg border border-white/20"
                          style={{ backgroundColor: u.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-xs truncate">
                            {u.name}
                            {u.id === user?.userId && <span className="ml-1 text-[10px] text-purple-300">(You)</span>}
                          </p>
                          <p className="text-[10px] text-gray-400">{u.blocksOwned} cells</p>
                        </div>
                        <span className="text-[10px] font-bold text-purple-300 ml-auto flex-shrink-0">
                            {((u.blocksOwned / 100) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {(showLeaderboard ? leaderboard : users).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">Waiting for players...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
