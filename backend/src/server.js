import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { initializeSocketHandlers } from './sockets/socketHandlers.js';
import { initializeGrid } from './utils/gridManager.js';

// Configuration
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Allowed origins - whitelist instead of wildcard for security
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  FRONTEND_URL
];

const app = express();
const httpServer = createServer(app);

// Socket.io configuration with secure CORS
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
    },
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
  if (NODE_ENV === 'development') {
    console.log(`Server running on port ${PORT}`);
  }
});

// Error handling
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
    process.exit(1);
  }
  throw error;
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close();
});
