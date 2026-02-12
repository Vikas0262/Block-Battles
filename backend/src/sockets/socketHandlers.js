// Socket.io Event Handlers
// Manages all real-time communication between clients

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C41A'
];

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
    console.log(`👤 User connected: ${socket.id}`);

    // ========== USER JOIN EVENT ==========
    socket.on('userJoin', (data) => {
      // Validate and sanitize username
      let userName = (data?.userName || '').trim();
      if (typeof userName !== 'string' || userName.length === 0 || userName.length > 20) {
        userName = getRandomUsername();
      }
      const userColor = getRandomColor();

      // Add user to grid manager
      gridManager.addUser(socket.id, userName, userColor);

      // Send user info back
      socket.emit('userInfo', {
        userId: socket.id,
        userName: userName,
        color: userColor
      });

      // Send current grid state to the new user
      socket.emit('gridState', {
        grid: gridManager.getGrid(),
        users: gridManager.getAllUsers()
      });

      // Broadcast to all other users that a new user joined
      socket.broadcast.emit('userJoined', {
        userId: socket.id,
        userName: userName,
        color: userColor,
        totalUsers: gridManager.getAllUsers().length
      });

      console.log(`✅ ${userName} joined. Total users: ${gridManager.getAllUsers().length}`);
    });

    // ========== CLAIM BLOCK EVENT ==========
    socket.on('claimBlock', (data) => {
      // Validate incoming data
      if (!data || typeof data.blockId !== 'number') {
        socket.emit('claimError', {
          blockId: null,
          message: 'Invalid request'
        });
        return;
      }

      const blockId = data.blockId;
      const userId = socket.id;

      // Attempt to claim the block
      const result = gridManager.claimBlock(blockId, userId);

      if (result.success) {
        // Broadcast to ALL users that block has been claimed
        io.emit('blockClaimed', {
          blockId: blockId,
          owner: userId,
          userName: result.block.userName,
          color: result.block.color,
          claimedAt: result.block.claimedAt
        });

        // Emit success to the user who claimed it
        socket.emit('claimSuccess', {
          blockId: blockId,
          message: 'Block claimed successfully!'
        });

        console.log(`🎯 ${result.block.userName} claimed block ${blockId}`);
      } else {
        // Send error back to user
        socket.emit('claimError', {
          blockId: blockId,
          message: result.message,
          owner: result.block?.userName
        });

        console.log(`❌ Failed to claim block ${blockId}: ${result.message}`);
      }
    });

    // ========== GET LEADERBOARD EVENT ==========
    socket.on('getLeaderboard', () => {
      const leaderboard = gridManager.getLeaderboard();
      socket.emit('leaderboard', leaderboard);
    });

    // ========== USER DISCONNECT EVENT ==========
    socket.on('disconnect', () => {
      const user = gridManager.getUser(socket.id);
      if (user) {
        gridManager.removeUser(socket.id);
        
        // Notify all users about disconnection
        io.emit('userDisconnected', {
          userId: socket.id,
          userName: user.name,
          totalUsers: gridManager.getAllUsers().length
        });

        console.log(`👋 ${user.name} disconnected. Total users: ${gridManager.getAllUsers().length}`);
      }
    });

    // ========== ERROR HANDLING ==========
    socket.on('error', (error) => {
      console.error(`🚨 Socket error for ${socket.id}:`, error);
    });
  });
}
