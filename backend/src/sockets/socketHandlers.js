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
    socket.on('userJoin', (data) => {
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

      socket.broadcast.emit('userJoined', {
        userId: socket.id,
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
        gridManager.removeUser(socket.id);
        io.emit('userDisconnected', {
          userId: socket.id,
          userName: user.name,
          totalUsers: gridManager.getAllUsers().length
        });
      }
    });
  });
}
