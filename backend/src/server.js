import 'dotenv/config.js';
// For local development, also try loading .env.local if it exists
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envLocalPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envLocalPath, override: true });

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeSocketHandlers } from './sockets/socketHandlers.js';
import { initializeGrid } from './utils/gridManager.js';

// Configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Allowed origins - whitelist instead of wildcard for security
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  FRONTEND_URL,
  // Support both http and https versions of frontend URL
  ...(FRONTEND_URL.startsWith('http://') ? 
    [FRONTEND_URL.replace('http://', 'https://')] : 
    FRONTEND_URL.startsWith('https://') ? 
    [FRONTEND_URL.replace('https://', 'http://')] : 
    []),
  // Additional origins from environment variable
  ...(process.env.ADDITIONAL_ORIGINS ? 
    process.env.ADDITIONAL_ORIGINS.split(',').map(url => url.trim()) : 
    [])
];

console.log('[Config] NODE_ENV=%s, PORT=%d, FRONTEND_URL=%s', NODE_ENV, PORT, FRONTEND_URL);

const app = express();
const httpServer = createServer(app);

// Socket.io configuration with CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const isAllowed = !origin || ALLOWED_ORIGINS.includes(origin);
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`✗ CORS rejected origin: ${origin}`);
        console.warn(`  Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
        callback(new Error('CORS not allowed'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: false,
    transports: ['websocket', 'polling']
  },
  // Allow both WebSocket and polling transports
  transports: ['websocket', 'polling']
});


// Middleware
app.use(cors());
app.use(express.json());

// Initialize grid on server start
const gridManager = initializeGrid();

// Socket.IO event logging
io.on('connection', (socket) => {
  console.log('[Socket] Client connected: %s', socket.id);
});

io.on('connect_error', (error) => {
  console.error(`✗ Socket.IO connection error: ${error.message}`);
});

// Initialize Socket.io event handlers
initializeSocketHandlers(io, gridManager);

// Basic route to check server health
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', gridSize: gridManager.getGridSize() });
});

// Start server with error handling & graceful shutdown
const server = httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('[Server] Running on port %d [%s]', PORT, NODE_ENV);
});

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use`);
    process.exit(1);
  }
  console.error('✗ Server error:', error.message);
  throw error;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('✗ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('✗ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
