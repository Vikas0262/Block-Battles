// Socket.io Event Handlers
// Manages all real-time communication between clients

// Diverse color palette - unique, distinct lighter colors for each player
const colors = [
  '#64B4FF', // Light Blue
  '#FF7864', // Light Coral Red
  '#FFC864', // Light Yellow
  '#64FF96', // Light Green
  '#C896FF', // Light Purple
  '#FF9664', // Light Orange
  '#64DCDC', // Light Cyan
  '#FF96C8', // Light Pink
  '#C8FF64', // Light Lime
  '#96E6C8'  // Light Teal
];

// Track assigned colors: userId -> color
const userColorMap = new Map();

// Maps for session and reconnection management
const sessionMap = new Map(); // sessionId -> socketId
const reconnectionSessions = new Map(); // userId -> { timeout }
const playerCooldowns = new Map(); // userId -> cooldownEndTime (ms)
const DISCONNECT_TIMEOUT = 30000; // 30 seconds
const SESSION_CLEANUP_INTERVAL = 3600000; // Clean up old sessions every hour
const COOLDOWN_MS = 500; // 500ms cooldown between claims

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
      try {
        // Validate and sanitize input
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
      } catch (error) {
        console.error('Error in userJoin handler:', error.message);
        socket.emit('error', { message: 'Server error during join' });
      }
    });

    socket.on('claimBlock', (data) => {
      try {
        if (!data || typeof data.blockId !== 'number') {
          socket.emit('claimError', { blockId: null, message: 'Invalid request' });
          return;
        }

        // Validate blockId is integer
        if (!Number.isInteger(data.blockId) || data.blockId < 0 || data.blockId >= 100) {
          socket.emit('claimError', { blockId: data.blockId, message: 'Invalid block ID' });
          return;
        }

        // Check cooldown
        const now = Date.now();
        const cooldownEnd = playerCooldowns.get(socket.id) || 0;
        
        if (now < cooldownEnd) {
          const remainingMs = cooldownEnd - now;
          socket.emit('claimError', { 
            blockId: data.blockId, 
            message: `Cooldown active. Wait ${Math.ceil(remainingMs / 100)}0ms`,
            remainingCooldown: remainingMs,
            isCooldown: true
          });
          return;
        }

        const result = gridManager.claimBlock(data.blockId, socket.id);

        if (result.success) {
          // Set cooldown for this user
          playerCooldowns.set(socket.id, now + COOLDOWN_MS);
          
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
      } catch (error) {
        console.error('Error in claimBlock handler:', error.message);
        socket.emit('claimError', { 
          blockId: data?.blockId, 
          message: 'Server error processing claim' 
        });
      }
    });

    socket.on('getLeaderboard', () => {
      try {
        socket.emit('leaderboard', gridManager.getLeaderboard());
      } catch (error) {
        console.error('Error in getLeaderboard handler:', error.message);
        socket.emit('error', { message: 'Failed to retrieve leaderboard' });
      }
    });

    // Handle explicit user leave (logout)
    socket.on('userLeave', (data) => {
      try {
        const userId = data?.userId || socket.id;
        const user = gridManager.getUser(userId);
        if (user) {
          gridManager.removeUser(userId);
          releaseUserColor(userId);
          playerCooldowns.delete(userId);
          reconnectionSessions.delete(userId);
          
          // Clean up session map entries
          for (const [sessionId, sess] of sessionMap.entries()) {
            const socketId = typeof sess === 'string' ? sess : sess.socketId;
            if (socketId === userId) {
              sessionMap.delete(sessionId);
              break;
            }
          }
          
          io.emit('userDisconnected', {
            userId: userId,
            userName: user.name,
            totalUsers: gridManager.getAllUsers().length
          });
          console.log('[User] Explicit leave: %s (%s)', userId, user.name);
        }
      } catch (error) {
        console.error('Error in userLeave handler:', error.message);
        socket.emit('error', { message: 'Error processing leave request' });
      }
    });

    socket.on('disconnect', () => {
      try {
        const user = gridManager.getUser(socket.id);
        if (user) {
          // Don't permanently remove user immediately, set a timeout
          const timeout = setTimeout(() => {
            // If user hasn't reconnected after timeout, permanently remove
            gridManager.removeUser(socket.id);
            releaseUserColor(socket.id); // Release color for reuse
            playerCooldowns.delete(socket.id); // Clean up cooldown
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
            console.log('[User] Permanently removed after timeout: %s (%s)', socket.id, user.name);
          }, DISCONNECT_TIMEOUT);

          // Store the timeout so we can clear it if user reconnects
          reconnectionSessions.set(socket.id, { timeout });
          console.log('[User] Disconnected, waiting for reconnection: %s (%s)', socket.id, user.name);
        }
      } catch (error) {
        console.error('Error in disconnect handler:', error.message);
      }
    });
  });
}
