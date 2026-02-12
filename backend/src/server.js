import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeSocketHandlers } from './sockets/socketHandlers.js';
import { initializeGrid } from './utils/gridManager.js';

// Load environment variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);

// CORS configuration for Socket.io
// In production, restrict to specific frontend URL
const io = new Server(httpServer, {
  cors: {
    origin: NODE_ENV === 'production' ? FRONTEND_URL : '*',
    methods: ['GET', 'POST'],
    credentials: false
  }
});


// Middleware
app.use(cors());
app.use(express.json());

// Initialize grid on server start
const gridManager = initializeGrid();

// Initialize Socket.io event handlers
initializeSocketHandlers(io, gridManager);

// Basic route to check server health
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', gridSize: gridManager.getGridSize() });
});

// Start server with error handling & graceful shutdown
const server = httpServer.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server running on http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
  console.log(`${'='.repeat(50)}\n`);
});

// Handle port in use error
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  }
  throw error;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⏹️  Shutting down gracefully...');
  server.close();
});
