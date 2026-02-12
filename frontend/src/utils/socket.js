import { io } from 'socket.io-client';

// Auto-detect backend URL from env or compute from current location
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 
                   window.location.origin.replace(':5173', ':3001') || 
                   'https://shared-grid-game.onrender.com';

let socket = null;
const listeners = new Set(); // Track registered listeners to prevent duplicates

// Log configuration
console.log(`🔗 Backend URL: ${SOCKET_URL}`);

// Connect to backend
export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'] // Prefer websocket
    });

    // Connection successful
    socket.on('connect', () => {
      console.log('✅ Connected to server');
    });

    // Connection error with logging
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
    });
  }
  return socket;
};

// Get socket instance
export const getSocket = () => {
  if (!socket) {
    return connectSocket();
  }
  return socket;
};

// Emit user join with error handling
export const emitUserJoin = (userName) => {
  try {
    getSocket().emit('userJoin', { userName });
  } catch (error) {
    console.error('Error joining game:', error);
  }
};

// Emit claim block with error handling
export const emitClaimBlock = (blockId) => {
  try {
    getSocket().emit('claimBlock', { blockId });
  } catch (error) {
    console.error('Error claiming block:', error);
  }
};

// Optimized listener registration (prevent duplicates)
const registerListener = (eventName, callback) => {
  const key = `${eventName}_${callback.toString().substring(0, 50)}`; // Simple key
  if (!listeners.has(key)) {
    getSocket().on(eventName, callback);
    listeners.add(key);
  }
};

// Listen for user info
export const onUserInfo = (callback) => {
  registerListener('userInfo', callback);
};

// Listen for grid state
export const onGridState = (callback) => {
  registerListener('gridState', callback);
};

// Listen for user joined
export const onUserJoined = (callback) => {
  registerListener('userJoined', callback);
};

// Listen for block claimed
export const onBlockClaimed = (callback) => {
  registerListener('blockClaimed', callback);
};

// Listen for claim success
export const onClaimSuccess = (callback) => {
  registerListener('claimSuccess', callback);
};

// Listen for claim error
export const onClaimError = (callback) => {
  registerListener('claimError', callback);
};

// Listen for user disconnected
export const onUserDisconnected = (callback) => {
  registerListener('userDisconnected', callback);
};

// Listen for grid update
export const onGridUpdate = (callback) => {
  registerListener('gridUpdate', callback);
};
