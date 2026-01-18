const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const usersRouter = require('./routes/users');
const sessionsRouter = require('./routes/sessions');
const positionsRouter = require('./routes/positions');
const statsRouter = require('./routes/stats');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/stats', statsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Skiing App API Server',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      sessions: '/api/sessions',
      positions: '/api/positions',
      stats: '/api/stats',
      websocket: 'ws://localhost:3000'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
const clients = new Map(); // sessionId -> Set of WebSocket clients

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');
  let currentSessionId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'join') {
        // Join a session for live updates
        currentSessionId = data.sessionId;
        if (!clients.has(currentSessionId)) {
          clients.set(currentSessionId, new Set());
        }
        clients.get(currentSessionId).add(ws);
        ws.send(JSON.stringify({ 
          type: 'joined', 
          sessionId: currentSessionId,
          message: 'Successfully joined session for live updates'
        }));
        console.log(`Client joined session ${currentSessionId}`);
      } else if (data.type === 'position_update') {
        // Broadcast position update to all clients in the session
        if (data.sessionId && clients.has(data.sessionId)) {
          const sessionClients = clients.get(data.sessionId);
          const broadcast = JSON.stringify({
            type: 'position_update',
            sessionId: data.sessionId,
            userId: data.userId,
            username: data.username,
            latitude: data.latitude,
            longitude: data.longitude,
            altitude: data.altitude,
            speed: data.speed,
            timestamp: new Date().toISOString()
          });
          
          sessionClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcast);
            }
          });
        }
      } else if (data.type === 'leave') {
        // Leave a session
        if (currentSessionId && clients.has(currentSessionId)) {
          clients.get(currentSessionId).delete(ws);
          if (clients.get(currentSessionId).size === 0) {
            clients.delete(currentSessionId);
          }
        }
        currentSessionId = null;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Clean up client from all sessions
    if (currentSessionId && clients.has(currentSessionId)) {
      clients.get(currentSessionId).delete(ws);
      if (clients.get(currentSessionId).size === 0) {
        clients.delete(currentSessionId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to Skiing App WebSocket server' 
  }));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`HTTP API: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  GET  /api/users - List all users');
  console.log('  POST /api/users - Create a new user');
  console.log('  GET  /api/sessions - List all sessions');
  console.log('  POST /api/sessions - Create a new session');
  console.log('  POST /api/sessions/:id/join - Join a session');
  console.log('  POST /api/positions - Update position');
  console.log('  GET  /api/positions/session/:id/latest - Get latest positions');
  console.log('  GET  /api/stats/leaderboard/speed - Speed leaderboard');
  console.log('  GET  /api/stats/leaderboard/distance - Distance leaderboard');
  console.log('  GET  /api/stats/leaderboard/runs - Runs leaderboard');
});

module.exports = server;
