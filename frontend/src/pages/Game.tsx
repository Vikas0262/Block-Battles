import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
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

// Memoized Grid Cell Component - prevents unnecessary re-renders
const GridCell = memo<{
  block: GridBlock;
  isSelected: boolean;
  isClaiming: boolean;
  onClaim: (blockId: number) => void;
}>(({ block, isSelected, isClaiming, onClaim }) => {
  const handleClick = useCallback(() => {
    if (!block.owner && !isClaiming) {
      onClaim(block.blockId);
    }
  }, [block.owner, block.blockId, isClaiming, onClaim]);

  return (
    <button
      onClick={handleClick}
      className={`
        rounded-lg flex items-center justify-center font-bold text-white text-lg
        transition-all duration-200 relative overflow-hidden
        ${!block.owner ? 'grid-cell cursor-pointer' : 'grid-cell-claimed cursor-default'}
      `}
      style={{
        backgroundColor: block.owner ? block.color : undefined,
        '--cell-color': block.owner ? `${block.color}80` : undefined,
        borderColor: isSelected ? 'rgba(255, 255, 255, 0.6)' : undefined,
      } as React.CSSProperties}
      title={block.owner ? `${block.userName}'s tile` : 'Click to claim'}
      disabled={!!block.owner || isClaiming}
    >
      {block.owner && (
        <span className="relative z-10 drop-shadow-lg text-sm md:text-lg">
          {block.userName?.substring(0, 2).toUpperCase()}
        </span>
      )}
    </button>
  );
});

GridCell.displayName = 'GridCell';

// Memoized Player Card Component
const PlayerCard = memo<{
  player: GridUser;
  isCurrentUser: boolean;
  rank: number;
  showRank: boolean;
}>(({ player, isCurrentUser, rank, showRank }) => (
  <div
    className="p-3 rounded-lg transition-all duration-300 border border-gray-700 hover:border-gray-600 flex items-start gap-3"
    style={{
      background: 'rgba(255, 255, 255, 0.05)'
    }}
  >
    {showRank && (
      <div className="text-sm font-bold text-gray-400 w-6 flex-shrink-0 pt-0.5">
        #{rank + 1}
      </div>
    )}

    <div className="flex items-center gap-3 flex-1">
      {/* Color Box */}
      <div
        className="w-10 h-10 rounded-md flex-shrink-0"
        style={{ 
          backgroundColor: player.color
        }}
      />
      
      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {player.name}
          {isCurrentUser && <span className="text-xs text-gray-400 ml-2">(You)</span>}
        </p>
      </div>

      {/* Points */}
      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold text-white">{player.blocksOwned}</p>
      </div>
    </div>
  </div>
));

PlayerCard.displayName = 'PlayerCard';

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
  const [showRulesModal, setShowRulesModal] = useState(true);

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Initialize socket connection with proper cleanup
  useEffect(() => {
    const socket = getSocket();
    let isMounted = true;

    const handleConnect = () => {
      if (isMounted) setIsConnected(true);
    };

    const handleDisconnect = () => {
      if (isMounted) setIsConnected(false);
    };

    const handleGridState = (data: any) => {
      if (isMounted) {
        setGrid(data.grid);
        setUsers(data.users);
        setIsLoading(false);
      }
    };

    const handleBlockClaimed = (data: any) => {
      if (!isMounted) return;
      
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
    };

    const handleClaimError = (data: any) => {
      if (!isMounted) return;
      setClaimError(data.message);
      setIsClaiming(false);
      setTimeout(() => isMounted && setClaimError(null), 3000);
    };

    const handleClaimSuccess = () => {
      if (isMounted) setClaimError(null);
    };

    const handleUserJoined = (data: any) => {
      if (!isMounted) return;
      setUsers((prevUsers) => {
        const userExists = prevUsers.some(u => u.id === data.userId);
        if (userExists) return prevUsers;
        return [...prevUsers, {
          id: data.userId,
          name: data.userName,
          color: data.color,
          blocksOwned: 0,
          joinedAt: Date.now(),
        }];
      });
    };

    const handleUserReconnected = (data: any) => {
      if (!isMounted) return;
      setUsers((prevUsers) => {
        const filtered = prevUsers.filter(u => u.id !== data.oldUserId);
        const userExists = filtered.some(u => u.id === data.newUserId);
        if (userExists) return filtered;
        return [...filtered, {
          id: data.newUserId,
          name: data.userName,
          color: data.color,
          blocksOwned: data.blocksOwned || 0,
          joinedAt: Date.now(),
        }];
      });
    };

    const handleUserDisconnected = (data: any) => {
      if (!isMounted) return;
      setUsers((prevUsers) => prevUsers.filter((u) => u.id !== data.userId));
      setGrid((prevGrid) =>
        prevGrid.map((block) =>
          block.owner === data.userId
            ? { ...block, owner: null, color: '#1a1a2e', userName: null, claimedAt: null }
            : block
        )
      );
    };

    const handleLeaderboard = (data: any) => {
      if (isMounted) setLeaderboard(data);
    };

    // Register all event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('gridState', handleGridState);
    socket.on('blockClaimed', handleBlockClaimed);
    socket.on('claimError', handleClaimError);
    socket.on('claimSuccess', handleClaimSuccess);
    socket.on('userJoined', handleUserJoined);
    socket.on('userReconnected', handleUserReconnected);
    socket.on('userDisconnected', handleUserDisconnected);
    socket.on('leaderboard', handleLeaderboard);

    // Emit userJoin or reconnect
    const sessionId = getSessionId();
    const userPayload = { userName: user?.userName || '', sessionId };
    
    if (user && socket.connected) {
      socket.emit('userJoin', userPayload);
    } else if (user && !socket.connected) {
      socket.once('connect', () => {
        if (isMounted) socket.emit('userJoin', userPayload);
      });
    }

    // Cleanup all event listeners on unmount
    return () => {
      isMounted = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('gridState', handleGridState);
      socket.off('blockClaimed', handleBlockClaimed);
      socket.off('claimError', handleClaimError);
      socket.off('claimSuccess', handleClaimSuccess);
      socket.off('userJoined', handleUserJoined);
      socket.off('userReconnected', handleUserReconnected);
      socket.off('userDisconnected', handleUserDisconnected);
      socket.off('leaderboard', handleLeaderboard);
    };
  }, [user]);

  // Memoized block click handler
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

  // Memoized sorted users and leaderboard
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => b.blocksOwned - a.blocksOwned);
  }, [users]);

  const topPlayers = useMemo(() => {
    return sortedUsers.slice(0, 10);
  }, [sortedUsers]);

  const displayLeaderboard = useMemo(() => {
    return showLeaderboard ? (leaderboard.length > 0 ? leaderboard : topPlayers) : sortedUsers;
  }, [showLeaderboard, leaderboard, topPlayers, sortedUsers]);

  if (!user) return null;

  // Show loading screen
  if (isLoading || grid.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading BlockBattles...</h2>
          <p className="text-gray-400">Initializing battle grid</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-pink-500/30 shadow-2xl max-w-md w-full p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-black text-white mb-2">Game Rules</h2>
              <p className="text-sm text-gray-400">Learn how to conquer the grid</p>
            </div>

            {/* Rules List */}
            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <div className="text-2xl flex-shrink-0">🎯</div>
                <div>
                  <p className="font-bold text-white text-sm">Claim Cells</p>
                  <p className="text-xs text-gray-300 mt-1">Click on empty cells to make them yours</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-2xl flex-shrink-0">⚡</div>
                <div>
                  <p className="font-bold text-white text-sm">First Click Wins</p>
                  <p className="text-xs text-gray-300 mt-1">Only the first player to click a cell owns it</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-2xl flex-shrink-0">🏆</div>
                <div>
                  <p className="font-bold text-white text-sm">Earn Points</p>
                  <p className="text-xs text-gray-300 mt-1">More cells = higher ranking on leaderboard</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="text-2xl flex-shrink-0">👥</div>
                <div>
                  <p className="font-bold text-white text-sm">Compete Live</p>
                  <p className="text-xs text-gray-300 mt-1">Battle with players around the world in real-time</p>
                </div>
              </div>
            </div>

            {/* OK Button */}
            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-3 rounded-xl font-bold text-white text-lg transition-all duration-300 bg-white/10 backdrop-blur-xl border-2 border-white/20 hover:border-pink-400 hover:bg-white/20 active:scale-95"
              style={{
                boxShadow: '0 4px 12px rgba(255, 0, 128, 0.2)'
              }}
            >
              OK, Let's Play
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="glass-nav px-3 sm:px-6 md:px-8 lg:px-16 py-3 md:py-4 sticky top-0 z-50">
        <div className="max-w-full lg:max-w-[1800px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg neon-border">
              ⚡
            </div>
            <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">BlockBattles</span>
          </div>

          {/* Center: Player Badge */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-2xl glass-card flex-1 justify-center">
            <div
              className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl shadow-lg"
              style={{ 
                backgroundColor: user.color,
                boxShadow: `0 4px 12px ${user.color}60`
              }}
            />
            <div className="hidden md:block">
              <p className="text-xs text-gray-400">Player</p>
              <p className="text-sm sm:text-lg font-bold text-white">{user.userName}</p>
            </div>
            <div className="hidden lg:block ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-white/20">
              <p className="text-xs text-gray-400">Captured</p>
              <p className="text-sm sm:text-lg font-bold text-pink-400">{currentUserBlocks} tiles</p>
            </div>
          </div>

          {/* Right: Status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Online Status */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl glass-card">
              <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${isConnected ? 'bg-green-500 pulse-glow' : 'bg-red-500'}`} />
              <span className="text-xs sm:text-sm font-medium text-white">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Top 10 Button */}
            <button
              onClick={handleLeaderboard}
              className="px-2 sm:px-5 py-2 rounded-lg sm:rounded-xl font-semibold text-white text-xs sm:text-base transition-all duration-300 whitespace-nowrap"
              style={{
                background: showLeaderboard 
                  ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                  : 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                boxShadow: showLeaderboard 
                  ? '0 4px 12px rgba(251, 191, 36, 0.4)' 
                  : '0 2px 8px rgba(251, 191, 36, 0.2)'
              }}
            >
              🏆 <span className="hidden sm:inline">Top 10</span>
            </button>

            {/* Exit Button */}
            <button
              onClick={handleLogout}
              className="px-2 sm:px-5 py-2 rounded-lg sm:rounded-xl font-semibold text-white text-xs sm:text-base transition-all duration-300"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
              }}
            >
              ✕ <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-full lg:max-w-[1800px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 py-4 md:py-8">
        {/* Title Section */}
        <div className="text-center mb-4 md:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 md:mb-4 neon-text">
            Conquer the Grid
          </h1>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <span className="text-green-400">👥</span>
            <span className="text-gray-300">Online:</span>
            <span className="font-bold text-white">{users.length} Players</span>
          </div>
        </div>

        {/* Error Message */}
        {claimError && (
          <div className="mx-2 sm:mx-4 md:max-w-4xl md:mx-auto mb-4 md:mb-6 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl text-center text-sm sm:text-base font-semibold"
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5'
            }}>
            ⚠️ {claimError}
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 lg:gap-8">
          {/* Grid Container */}
          <div className="glass-card rounded-3xl p-3 sm:p-6 md:p-8">
            <div
              className="grid gap-1 sm:gap-2 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                maxWidth: 'min(90vw, 100%)',
                width: '100%',
                aspectRatio: '1 / 1',
              }}
            >
              {grid.map((block) => (
                <GridCell
                  key={block.blockId}
                  block={block}
                  isSelected={selectedBlockId === block.blockId}
                  isClaiming={isClaming}
                  onClaim={handleBlockClick}
                />
              ))}
            </div>
          </div>

          {/* Right Sidebar - Leaderboard */}
          <div className="glass-card rounded-3xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-black text-white">
                {showLeaderboard ? '🏆 LEADERBOARD' : '👥 PLAYERS'}
              </h2>
              <div className="text-xs sm:text-sm text-gray-400">
                {displayLeaderboard.length} {displayLeaderboard.length === 1 ? 'Player' : 'Players'}
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3 max-h-[400px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2" style={{ scrollbarGutter: 'stable' }}>
              {displayLeaderboard.map((u, idx) => (
                <PlayerCard
                  key={u.id}
                  player={u}
                  isCurrentUser={u.id === user?.userId}
                  rank={idx}
                  showRank={showLeaderboard}
                />
              ))}

              {displayLeaderboard.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-lg">No players yet</p>
                  <p className="text-sm mt-2">Waiting for players to join...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Your Tiles Card */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-xl font-bold text-gray-300 mb-4">Your Tiles</h3>
            <div className="flex items-center gap-6">
              <div className="text-6xl font-black text-white">{currentUserBlocks}</div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#ef4444' }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#3b82f6' }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#f59e0b' }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: '#22c55e' }} />
              </div>
            </div>
            <div className="mt-4 text-sm">
              <span className="text-gray-400">Controlled by:</span>
              <span className="ml-2 px-3 py-1 rounded-lg font-bold text-white" style={{ backgroundColor: user.color }}>
                {user.userName}
              </span>
            </div>
          </div>

          {/* Top Players Card */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-xl font-bold text-gray-300 mb-4">Top Players</h3>
            <div className="flex items-center justify-around">
              {topPlayers.slice(0, 3).map((player, idx) => (
                <div key={player.id} className="text-center">
                  <div className="relative mb-3">
                    <div
                      className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black text-white shadow-xl"
                      style={{ 
                        backgroundColor: player.color,
                        boxShadow: `0 8px 24px ${player.color}60`,
                        border: '3px solid rgba(255, 255, 255, 0.3)'
                      }}
                    >
                      {player.name.substring(0, 1).toUpperCase()}
                    </div>
                    {idx < 3 && (
                      <div className={`
                        absolute -bottom-2 left-1/2 transform -translate-x-1/2
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : 'bg-orange-400 text-orange-900'}
                      `}>
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <p className="font-bold text-white text-sm mb-1">{player.name}</p>
                  <p className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ backgroundColor: player.color, color: 'white' }}>
                    {player.blocksOwned} tiles
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button className="px-6 py-3 rounded-2xl glass-card font-semibold text-white transition-all duration-300 hover:scale-105">
            🔍 Zoom
          </button>
          <button className="px-6 py-3 rounded-2xl font-semibold text-white transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
            }}>
            🛡️ Cooldown Active
          </button>
          <button className="px-6 py-3 rounded-2xl glass-card font-semibold text-white transition-all duration-300 hover:scale-105">
            📊 Stats
          </button>
        </div>
      </div>
    </div>
  );
};
