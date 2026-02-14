import io from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const SESSION_STORAGE_KEY = 'blockbattles_session_id';

let socket: any = null;

// Generate or retrieve persistent session ID
export const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
};

// Clear session ID (on logout)
export const clearSessionId = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getSocket = () => {
  if (!socket) {
    try {
      socket = io(BACKEND_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'],
      });

      // Handle connection errors
      socket.on('connect_error', (error: any) => {
        console.error('[Socket] Connection error:', error.message);
      });

      socket.on('error', (error: any) => {
        console.error('[Socket] Error:', error);
      });

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
      });
    } catch (error) {
      console.error('[Socket] Failed to create socket connection:', error);
      throw error;
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    } catch (error) {
      console.error('[Socket] Error during disconnect:', error);
      socket = null;
    }
  }
};
