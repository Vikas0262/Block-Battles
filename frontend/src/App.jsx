import React, { useState, useEffect, useCallback } from 'react';
import Grid from './components/Grid';
import UserInfo from './components/UserInfo';
import Toast from './components/Toast';
import {
  connectSocket,
  getSocket,
  emitUserJoin,
  onUserInfo,
  onGridState,
  onUserJoined,
  onBlockClaimed,
  onClaimSuccess,
  onClaimError,
  onUserDisconnected
} from './utils/socket';

function App() {
  const [grid, setGrid] = useState([]); // Grid state
  const [userInfo, setUserInfo] = useState(null); // Current user info
  const [users, setUsers] = useState([]); // All connected users
  const [toast, setToast] = useState(null); // Toast notifications
  const [userName, setUserName] = useState(''); // Temporary username input
  const [showNamePrompt, setShowNamePrompt] = useState(true); // Show name prompt initially

  // Initialize socket connection on mount
  useEffect(() => {
    connectSocket();
  }, []);

  // Memoized toast function to prevent recreations
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Memoized block click handler
  const handleBlockClick = useCallback((blockId) => {
    if (userInfo) {
      const socket = getSocket();
      socket.emit('claimBlock', { blockId });
    }
  }, [userInfo]);

  // Memoized name submission handler
  const handleNameSubmit = useCallback((e) => {
    e.preventDefault();
    if (userName.trim()) {
      emitUserJoin(userName.trim());
      setShowNamePrompt(false);
    }
  }, [userName]);

  // Listen for all socket events
  useEffect(() => {
    const socket = getSocket();

    // Receive user info
    onUserInfo((data) => {
      setUserInfo(data);
      console.log('✅ User info received:', data);
    });

    // Receive grid state on join
    onGridState((data) => {
      setGrid(data.grid);
      setUsers(data.users);
      console.log('✅ Grid state received');
    });

    // Listen for new user joined
    onUserJoined((data) => {
      setUsers(prev => [...prev, { id: data.userId, name: data.userName, color: data.color, blocksOwned: 0 }]);
      showToast(`${data.userName} joined the game!`, 'info');
      console.log(`👋 ${data.userName} joined`);
    });

    // Listen for block claimed
    onBlockClaimed((data) => {
      setGrid(prev => {
        const newGrid = [...prev];
        newGrid[data.blockId] = {
          ...newGrid[data.blockId],
          owner: data.owner,
          userName: data.userName,
          color: data.color,
          claimedAt: data.claimedAt
        };
        return newGrid;
      });
      
      // Update users block count
      setUsers(prev => prev.map(u => 
        u.id === data.owner ? { ...u, blocksOwned: (u.blocksOwned || 0) + 1 } : u
      ));
    });

    // Listen for claim success
    onClaimSuccess((data) => {
      showToast('Block claimed! 🎉', 'success');
    });

    // Listen for claim error
    onClaimError((data) => {
      showToast(`Claimed by ${data.owner || 'someone'}`, 'error');
    });

    // Listen for user disconnected
    onUserDisconnected((data) => {
      setUsers(prev => prev.filter(u => u.id !== data.userId));
      showToast(`${data.userName} left the game`, 'info');
    });

    return () => {
      // Cleanup if needed
    };
  }, [showToast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex flex-col">
      {/* Name Input Prompt */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center min-w-[90%] md:min-w-[400px] max-w-md animate-scale-up">
            <div className="mb-6">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Welcome! 🎮
              </h2>
              <p className="text-gray-600 text-sm md:text-base">Join the Shared Grid Game</p>
            </div>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Enter your name..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoFocus
                maxLength="20"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
              />
              <button 
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!userName.trim()}
              >
                Join Game
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main App */}
      {!showNamePrompt && userInfo && (
        <>
          <header className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-center mb-3">
                🎮 Shared Grid Game
              </h1>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 text-gray-700 font-medium text-sm md:text-base">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <span>Players: <span className="font-bold text-indigo-600">{users.length}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  <span>Total Blocks: <span className="font-bold text-purple-600">100</span></span>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
            <aside className="w-full lg:w-72 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-5 md:p-6 h-fit">
              <UserInfo user={userInfo} />
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span>👥</span>
                  <span>Players Online</span>
                  <span className="ml-auto text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{users.length}</span>
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {users.map(u => (
                    <div 
                      key={u.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-all duration-200 border-l-4"
                      style={{ borderLeftColor: u.color }}
                    >
                      <div 
                        className="w-10 h-10 rounded-lg shadow-md flex-shrink-0 ring-2 ring-white" 
                        style={{ backgroundColor: u.color }}
                      ></div>
                      <span className="flex-1 font-medium text-gray-800 text-sm truncate">{u.name}</span>
                      <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-md font-semibold shadow-sm">
                        {u.blocksOwned || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="flex-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-5 md:p-8">
              <Grid 
                grid={grid} 
                userInfo={userInfo}
                onBlockClick={handleBlockClick}
              />
            </main>
          </div>

          {/* Toast Notification */}
          {toast && <Toast message={toast.message} type={toast.type} />}
        </>
      )}
    </div>
  );
}

export default App;
