import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSocket, disconnectSocket, getSessionId, clearSessionId } from '../services/socketService';
import GridCell from '../components/GridCell';
import PlayerCard from '../components/PlayerCard';
import RulesDialog from '../components/RulesDialog';
import Button from '../components/Button';

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
  const [showRulesModal, setShowRulesModal] = useState(true);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);

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

    // Handle browser/tab close
    const handleBeforeUnload = () => {
      socket.emit('userLeave', { userId: user?.userId });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

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
      
      // If this is a cooldown error, set cooldown until
      if (data.isCooldown && data.remainingCooldown) {
        setCooldownUntil(Date.now() + data.remainingCooldown);
      }
      
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
            ? { ...block, owner: null, color: '#3a3f4d', userName: null, claimedAt: null }
            : block
        )
      );
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
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('gridState', handleGridState);
      socket.off('blockClaimed', handleBlockClaimed);
      socket.off('claimError', handleClaimError);
      socket.off('claimSuccess', handleClaimSuccess);
      socket.off('userJoined', handleUserJoined);
      socket.off('userReconnected', handleUserReconnected);
      socket.off('userDisconnected', handleUserDisconnected);
    };
  }, [user]);

  // Cooldown timer effect - updates UI periodically
  useEffect(() => {
    if (cooldownUntil <= 0) return;

    const interval = setInterval(() => {
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(0);
        clearInterval(interval);
      }
    }, 50); // Update every 50ms for smooth visual feedback

    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Memoized block click handler
  const handleBlockClick = useCallback(
    (blockId: number) => {
      if (isClaming) return;

      // Check if cooldown is still active
      if (Date.now() < cooldownUntil) {
        setClaimError('Cooldown active! Please wait...');
        setTimeout(() => setClaimError(null), 2000);
        return;
      }

      const block = grid[blockId];
      if (block?.owner === null) {
        setIsClaiming(true);
        setSelectedBlockId(blockId);
        setCooldownUntil(Date.now() + 500); // Optimistic cooldown
        const socket = getSocket();
        socket.emit('claimBlock', { blockId });
      } else {
        setClaimError(`Already claimed by ${block?.userName}`);
        setTimeout(() => setClaimError(null), 3000);
      }
    },
    [grid, isClaming, cooldownUntil]
  );

  const handleLogout = () => {
    const socket = getSocket();
    socket.emit('userLeave', { userId: user?.userId });
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
    return sortedUsers;
  }, [sortedUsers]);

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
    <div className="min-h-screen" style={{ background: '#1a1a2e' }}>
      <RulesDialog isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      {/* Top Navigation Bar */}
      <nav className="glass-nav px-3 sm:px-6 md:px-8 lg:px-16 py-3 md:py-4 sticky top-0 z-50">
        <div className="max-w-full lg:max-w-[1800px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            <span className="text-lg sm:text-2xl font-bold text-white tracking-tight">BlockBattles</span>
          </div>

          {/* Right: Player Badge & Status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Simple Player Badge - Compact */}
            <div className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg glass-card" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              <div
                className="w-8 sm:w-9 h-8 sm:h-9 rounded-md shadow-lg"
                style={{ 
                  backgroundColor: user.color,
                  boxShadow: `0 4px 12px ${user.color}60`
                }}
              />
              <div className="block">
                <p className="text-xs sm:text-xs text-gray-400">{user.userName}</p>
                <p className="text-xs sm:text-sm font-bold text-pink-400">{currentUserBlocks} tiles</p>
              </div>
            </div>

            {/* Online Status */}
            <div className="hidden sm:flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg sm:rounded-xl glass-card">
              <div className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full ${isConnected ? 'bg-green-500 pulse-glow' : 'bg-red-500'}`} />
              <span className="text-xs sm:text-sm font-medium text-white">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Exit Button */}
            <Button
              onClick={handleLogout}
              variant="secondary"
              className="px-2 sm:px-5 py-2 text-xs sm:text-base"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
              }}
            >
              ✕ <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-full lg:max-w-[1800px] mx-auto px-3 sm:px-6 md:px-8 lg:px-16 py-4 md:py-8">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
              Conquer the Grid
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 sm:gap-6">
            {/* Online Players - Simple Text */}
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <span className="text-green-400">👥</span>
              <span className="text-gray-300">Online:</span>
              <span className="font-bold text-white">{users.length} Players</span>
            </div>
            {/* Cooldown Status - Simple Text */}
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <span className="text-gray-300">Status:</span>
              <span
                style={{
                  fontWeight: 600,
                  color: Date.now() < cooldownUntil ? '#fbbf24' : '#22c55e'
                }}
              >
                {Date.now() < cooldownUntil 
                  ? `🛡️ Cooldown: ${Math.ceil((cooldownUntil - Date.now()) / 100)}0ms`
                  : '✓ Ready to claim'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {claimError && (
          <div className="mx-2 sm:mx-4 md:max-w-4xl md:mx-auto mb-4 md:mb-6 px-4 md:px-6 py-2 md:py-3 rounded-lg text-center text-sm sm:text-base font-medium"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff'
            }}>
            {claimError}
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 lg:gap-8">
          {/* Grid Container */}
          <div className="glass-card rounded-3xl p-3 sm:p-6 md:p-8">
            <div
              className="grid gap-1 sm:gap-2 mx-auto"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                maxWidth: 'min(90vw, 550px)',
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

          {/* Right Sidebar - Leaderboard & Top Players */}
          <div className="flex flex-col gap-4 lg:gap-6">
            {/* Players/Leaderboard Card */}
            <div className="glass-card rounded-3xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl font-black text-white">
                  👥 PLAYERS
                </h2>
                <div className="text-xs sm:text-sm text-gray-400">
                  {displayLeaderboard.length} {displayLeaderboard.length === 1 ? 'Player' : 'Players'}
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 overflow-y-auto pr-1 sm:pr-2" style={{ scrollbarGutter: 'stable', maxHeight: 'calc(100vh - 300px)' }}>
                {displayLeaderboard.map((u, idx) => (
                  <PlayerCard
                    key={u.id}
                    player={u}
                    isCurrentUser={u.id === user?.userId}
                    rank={idx}
                    showRank={false}
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

            {/* Top Players Card */}
            <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-300 mb-4">🏆 Top 3</h3>
              <div className="flex flex-col gap-3">
                {topPlayers.slice(0, 3).map((player, idx) => (
                  <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white shadow-lg flex-shrink-0"
                      style={{ 
                        backgroundColor: player.color,
                        boxShadow: `0 4px 12px ${player.color}60`
                      }}
                    >
                      {player.name.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : 'bg-orange-400 text-orange-900'}`}>
                          #{idx + 1}
                        </span>
                        <p className="font-bold text-white text-sm truncate">{player.name}</p>
                      </div>
                      <p className="text-xs text-gray-300 mt-1">{player.blocksOwned} tiles</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
