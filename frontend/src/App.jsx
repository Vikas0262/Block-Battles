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
import './App.css';

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
    <div className="app">
      {/* Name Input Prompt */}
      {showNamePrompt && (
        <div className="modal-overlay">
          <div className="name-prompt">
            <h2>Welcome to Shared Grid! 🎮</h2>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                placeholder="Enter your name..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoFocus
                maxLength="20"
              />
              <button type="submit">Join Game</button>
            </form>
          </div>
        </div>
      )}

      {/* Main App */}
      {!showNamePrompt && userInfo && (
        <>
          <header className="header">
            <h1>🎮 Shared Grid Game</h1>
            <div className="header-stats">
              <span>📍 Players: {users.length}</span>
              <span>📦 Total Blocks: 100</span>
            </div>
          </header>

          <div className="container">
            <aside className="sidebar">
              <UserInfo user={userInfo} />
              
              <div className="players-list">
                <h3>👥 Players Online</h3>
                <div className="players">
                  {users.map(u => (
                    <div 
                      key={u.id} 
                      className="player-item"
                      style={{ borderLeftColor: u.color }}
                    >
                      <span className="player-color" style={{ backgroundColor: u.color }}></span>
                      <span className="player-name">{u.name}</span>
                      <span className="player-blocks">{u.blocksOwned}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <main className="main-content">
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
