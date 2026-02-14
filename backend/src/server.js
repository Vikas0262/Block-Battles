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

console.log(`[Config] ENV=${NODE_ENV} PORT=${PORT}`);

const app = express();
const httpServer = createServer(app);

// Socket.io configuration with CORS - simple and clean
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket']
});

// Middleware
app.use(cors({
  origin: FRONTEND_URL
}));

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
