// Socket.io Event Handlers
// Manages all real-time communication between clients

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C41A'
];

// Map to store session to socket mapping (sessionId -> oldSocketId)
const sessionMap = new Map();
// Map to store reconnection sessions (userId -> { socket, timeout })
const reconnectionSessions = new Map();
const DISCONNECT_TIMEOUT = 30000; // 30 seconds before user is permanently removed

// Get random color for new user
function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

// Generate random username
function getRandomUsername() {
  const adjectives = ['Happy', 'Quick', 'Clever', 'Bright', 'Swift', 'Brave', 'Cool', 'Bold'];
  const animals = ['Panda', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Lion', 'Bear', 'Shark'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj}${animal}${Math.floor(Math.random() * 100)}`;
}

export function initializeSocketHandlers(io, gridManager) {
  io.on('connection', (socket) => {
    // Handle user join (new connection or reconnection)
    socket.on('userJoin', (data) => {
      let userName = (data?.userName || '').trim();
      if (typeof userName !== 'string' || userName.length === 0 || userName.length > 20) {
        userName = getRandomUsername();
      }
      
      const sessionId = data?.sessionId;
      const newUserId = socket.id;
      
      // Check if this is a reconnection (sessionId exists and maps to an old socket)
      if (sessionId && sessionMap.has(sessionId)) {
        const oldUserId = sessionMap.get(sessionId);
        const existingUser = gridManager.getUser(oldUserId);
        
        if (existingUser && oldUserId !== newUserId) {
          // This is a reconnection - transfer ownership
          console.log(`🔄 User reconnecting: ${oldUserId} -> ${newUserId}`);
          
          // Clear any pending reconnection timeout
          if (reconnectionSessions.has(oldUserId)) {
            const session = reconnectionSessions.get(oldUserId);
            clearTimeout(session.timeout);
            reconnectionSessions.delete(oldUserId);
          }
          
          // Transfer blocks from old user to new user
          gridManager.transferUser(oldUserId, newUserId);
          
          // Update session map
          sessionMap.set(sessionId, newUserId);
          
          const user = gridManager.getUser(newUserId);
          
          // Send user info back
          socket.emit('userInfo', {
            userId: newUserId,
            userName: user.name,
            color: user.color
          });
          
          // Send current grid state
          socket.emit('gridState', {
            grid: gridManager.getGrid(),
            users: gridManager.getAllUsers()
          });
          
          // Notify all clients about the reconnection
          io.emit('userReconnected', {
            oldUserId: oldUserId,
            newUserId: newUserId,
            userName: user.name,
            color: user.color,
            blocksOwned: user.blocksOwned,
            totalUsers: gridManager.getAllUsers().length
          });
          
          return;
        }
      }
      
      // New user connection
      const userColor = getRandomColor();
      
      // Store session mapping
      if (sessionId) {
        sessionMap.set(sessionId, newUserId);
      }
      
      // Clear any pending reconnection timeout for this socket ID
      if (reconnectionSessions.has(newUserId)) {
        const session = reconnectionSessions.get(newUserId);
        clearTimeout(session.timeout);
        reconnectionSessions.delete(newUserId);
      }

      // Add user to grid manager
      gridManager.addUser(newUserId, userName, userColor);

      // Send user info back
      socket.emit('userInfo', {
        userId: newUserId,
        userName: userName,
        color: userColor
      });

      // Send current grid state to the new user
      socket.emit('gridState', {
        grid: gridManager.getGrid(),
        users: gridManager.getAllUsers()
      });

      socket.broadcast.emit('userJoined', {
        userId: newUserId,
        userName: userName,
        color: userColor,
        totalUsers: gridManager.getAllUsers().length
      });
    });

    socket.on('claimBlock', (data) => {
      if (!data || typeof data.blockId !== 'number') {
        socket.emit('claimError', { blockId: null, message: 'Invalid request' });
        return;
      }

      const result = gridManager.claimBlock(data.blockId, socket.id);

      if (result.success) {
        io.emit('blockClaimed', {
          blockId: data.blockId,
          owner: socket.id,
          userName: result.block.userName,
          color: result.block.color,
          claimedAt: result.block.claimedAt
        });
        socket.emit('claimSuccess', { blockId: data.blockId, message: 'Block claimed successfully!' });
      } else {
        socket.emit('claimError', {
          blockId: data.blockId,
          message: result.message,
          owner: result.block?.userName
        });
      }
    });

    socket.on('getLeaderboard', () => {
      socket.emit('leaderboard', gridManager.getLeaderboard());
    });

    socket.on('disconnect', () => {
      const user = gridManager.getUser(socket.id);
      if (user) {
        // Don't permanently remove user immediately, set a timeout
        const timeout = setTimeout(() => {
          // If user hasn't reconnected after timeout, permanently remove
          gridManager.removeUser(socket.id);
          reconnectionSessions.delete(socket.id);
          
          // Clean up session map
          for (const [sessionId, socketId] of sessionMap.entries()) {
            if (socketId === socket.id) {
              sessionMap.delete(sessionId);
              break;
            }
          }
          
          io.emit('userDisconnected', {
            userId: socket.id,
            userName: user.name,
            totalUsers: gridManager.getAllUsers().length
          });
          console.log(`❌ User ${socket.id} (${user.name}) permanently removed after timeout`);
        }, DISCONNECT_TIMEOUT);

        // Store the timeout so we can clear it if user reconnects
        reconnectionSessions.set(socket.id, { timeout });
        console.log(`⏱️  User ${socket.id} (${user.name}) disconnected, waiting for reconnection...`);
      }
    });
  });
}

