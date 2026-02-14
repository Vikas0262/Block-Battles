// Socket.io Event Handlers
// Manages all real-time communication between clients

// Hot pink color palette - unique colors for each player
const colors = [
  '#FF0080', '#FF1493', '#FF33A1', '#FF66B3', '#FF99CC',
  '#E91E63', '#C2185B', '#AD1457', '#880E4F', '#FF006E'
];

// Track assigned colors: userId -> color
const userColorMap = new Map();

// Maps for session and reconnection management
const sessionMap = new Map(); // sessionId -> socketId
const reconnectionSessions = new Map(); // userId -> { timeout }
const DISCONNECT_TIMEOUT = 30000; // 30 seconds
const SESSION_CLEANUP_INTERVAL = 3600000; // Clean up old sessions every hour

// Get unique color for user - avoids conflicts
function assignUserColor(userId, gridManager) {
  // If user already has a color assigned, return it
  if (userColorMap.has(userId)) {
    return userColorMap.get(userId);
  }
  
  // Get colors currently in use by active users
  const activeColors = new Set(
    gridManager.getAllUsers().map(u => u.color)
  );
  
  // Find available colors
  const availableColors = colors.filter(c => !activeColors.has(c));
  
  // Pick an available color
  let assignedColor;
  if (availableColors.length > 0) {
    assignedColor = availableColors[Math.floor(Math.random() * availableColors.length)];
  } else {
    // Fallback: use any color (should rarely happen with 10 colors)
    assignedColor = colors[Math.floor(Math.random() * colors.length)];
  }
  
  // Store the color assignment
  userColorMap.set(userId, assignedColor);
  return assignedColor;
}

// Release user color when they disconnect
function releaseUserColor(userId) {
  userColorMap.delete(userId);
}

// Generate random username
function getRandomUsername() {
  const adjectives = ['Happy', 'Quick', 'Clever', 'Bright', 'Swift', 'Brave', 'Cool', 'Bold'];
  const animals = ['Panda', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Lion', 'Bear', 'Shark'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  return `${adj}${animal}${Math.floor(Math.random() * 100)}`;
}

// Clean up stale sessions periodically
function startSessionCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of sessionMap.entries()) {
      // Remove sessions older than 24 hours
      if (data.timestamp && now - data.timestamp > 86400000) {
        sessionMap.delete(sessionId);
      }
    }
  }, SESSION_CLEANUP_INTERVAL);
}

export function initializeSocketHandlers(io, gridManager) {
  // Start periodic session cleanup
  startSessionCleanup();

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
        const oldData = sessionMap.get(sessionId);
        const oldUserId = typeof oldData === 'string' ? oldData : oldData.socketId;
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
          
          // Update session map with timestamp
          sessionMap.set(sessionId, { 
            socketId: newUserId, 
            timestamp: Date.now() 
          });
          
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
      
      // New user connection - assign unique color
      const userColor = assignUserColor(newUserId, gridManager);
      
      // Store session mapping with timestamp
      if (sessionId) {
        sessionMap.set(sessionId, { 
          socketId: newUserId, 
          timestamp: Date.now() 
        });
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

      // Notify ALL clients (including the new user) about the new player
      io.emit('userJoined', {
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
          releaseUserColor(socket.id); // Release color for reuse
          reconnectionSessions.delete(socket.id);
          
          // Clean up session map entries
          for (const [sessionId, data] of sessionMap.entries()) {
            const socketId = typeof data === 'string' ? data : data.socketId;
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
