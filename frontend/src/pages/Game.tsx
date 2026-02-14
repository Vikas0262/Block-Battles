import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { getSocket, disconnectSocket, getSessionId, clearSessionId } from '../services/socketService';
import GridCell from '../components/GridCell';
import RulesDialog from '../components/RulesDialog';
import Button from '../components/Button';
import { GameNavbar } from '../components/GameNavbar';
import { GameSidebar } from '../components/GameSidebar';

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
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handle browser back button - show exit confirmation
  useEffect(() => {
    // Push a history state to intercept back button
    window.history.pushState({ gameActive: true }, '');

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      // Back button pressed - show confirmation
      setShowExitConfirm(true);
      // Push state again to keep the modal active
      window.history.pushState({ gameActive: true }, '');
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Show confirmation on browser close/refresh
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  // Handle confirmed exit
  const handleConfirmExit = () => {
    const socket = getSocket();
    socket.emit('userLeave', { userId: user?.userId });
    
    // Wait a moment to ensure the event is processed by the server
    // before disconnecting and clearing local state
    setTimeout(() => {
      clearSessionId();
      disconnectSocket();
      clearUser();
      setShowExitConfirm(false);
      navigate('/');
    }, 100);
  };

  // Handle cancel exit
  const handleCancelExit = () => {
    setShowExitConfirm(false);
  };

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

    const handleSocketError = (error: any) => {
      if (!isMounted) return;
      console.error('[Game] Socket error:', error);
      setClaimError('Connection error. Please refresh the page.');
    };

    // Register all event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleSocketError);
    socket.on('gridState', handleGridState);
    socket.on('blockClaimed', handleBlockClaimed);
    socket.on('claimError', handleClaimError);
    socket.on('claimSuccess', handleClaimSuccess);
    socket.on('userJoined', handleUserJoined);
    socket.on('userReconnected', handleUserReconnected);
    socket.on('userDisconnected', handleUserDisconnected);

    // Check if socket is already connected and update state
    if (socket.connected && isMounted) {
      setIsConnected(true);
    }

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
      socket.off('error', handleSocketError);
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
    setShowExitConfirm(true);
  };

  const currentUserBlocks = useMemo(() => {
    return grid.filter((block) => block.owner === user?.userId).length;
  }, [grid, user?.userId]);

  const topPlayer = useMemo(() => {
    if (users.length === 0) return null;
    return users.reduce((max, user) => 
      user.blocksOwned > max.blocksOwned ? user : max
    );
  }, [users]);

  if (!user) return null;

  // Show loading screen
  if (isLoading || grid.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1a2e' }}>
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
      <GameNavbar
        userName={user.userName}
        userColor={user.color}
        currentUserBlocks={currentUserBlocks}
        isConnected={isConnected}
        onExit={handleLogout}
      />

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
            {/* Top Player - Leaderboard */}
            {topPlayer && (
              <div className="flex items-center gap-2 text-sm sm:text-base">
                <span className="text-yellow-400">👑</span>
                <span className="text-gray-300">Leading:</span>
                <span className="font-bold text-white">{topPlayer.name}</span>
                <span className="text-yellow-400 font-bold">{topPlayer.blocksOwned}</span>
                {/* Top player color indicator */}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: topPlayer.color,
                    boxShadow: `0 0 8px ${topPlayer.color}80`
                  }}
                />
              </div>
            )}
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

        {/* Error Message - Fixed to Top Right */}
        {claimError && (
          <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right px-4 md:px-6 py-3 md:py-4 rounded-lg text-sm md:text-base font-medium max-w-xs md:max-w-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#1a1a2e',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(12px)'
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
          <GameSidebar users={users} currentUserId={user?.userId} />
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border border-pink-500/30 shadow-2xl max-w-sm w-full p-8">
            {/* Icon */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Exit Game?</h2>
              <p className="text-sm text-gray-300">Your player will be removed from the game</p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleConfirmExit} 
                variant="primary" 
                fullWidth
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                ✓ Exit Game
              </Button>
              <Button 
                onClick={handleCancelExit} 
                variant="secondary" 
                fullWidth
              >
                ✕ Stay in Game
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
