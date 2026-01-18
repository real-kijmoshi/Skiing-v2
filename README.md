# Skiing-v2

Express.js server for managing skiing sessions with friends, featuring live position tracking, stats, and leaderboards.

## Features

- **User Management**: Create and manage user accounts
- **Skiing Sessions**: Create and join skiing sessions with friends
- **Live Position Tracking**: Real-time GPS position updates via WebSocket
- **Statistics**: Track speed, distance, altitude, and runs for each user
- **Leaderboards**: Compete with friends on speed, distance, and runs
- **WebSocket Support**: Real-time updates for live position tracking

## Installation

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
npm run init-db
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Users

- `POST /api/users` - Create a new user
  - Body: `{ "username": "string", "email": "string" }`
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID

### Sessions

- `POST /api/sessions` - Create a new skiing session
  - Body: `{ "name": "string", "creator_id": number, "location": "string" }`
- `GET /api/sessions` - Get all sessions
- `GET /api/sessions/:id` - Get session details with participants
- `POST /api/sessions/:id/join` - Join a session
  - Body: `{ "user_id": number }`
- `PATCH /api/sessions/:id/end` - End a session

### Positions

- `POST /api/positions` - Update user position
  - Body: `{ "session_id": number, "user_id": number, "latitude": number, "longitude": number, "altitude": number, "speed": number }`
- `GET /api/positions/session/:sessionId/latest` - Get latest positions for all users in a session
- `GET /api/positions/session/:sessionId/user/:userId` - Get position history for a user

### Stats & Leaderboards

- `GET /api/stats/session/:sessionId` - Get all stats for a session
- `GET /api/stats/session/:sessionId/user/:userId` - Get stats for a specific user in a session
- `GET /api/stats/user/:userId/summary` - Get user's overall stats summary
- `GET /api/stats/leaderboard/speed` - Top speeds leaderboard
- `GET /api/stats/leaderboard/distance` - Total distance leaderboard
- `GET /api/stats/leaderboard/runs` - Most runs leaderboard

## WebSocket Usage

Connect to `ws://localhost:3000` for real-time updates.

### Message Types

**Join a session:**
```json
{
  "type": "join",
  "sessionId": 1
}
```

**Send position update:**
```json
{
  "type": "position_update",
  "sessionId": 1,
  "userId": 1,
  "username": "skier1",
  "latitude": 46.5,
  "longitude": 7.5,
  "altitude": 2500,
  "speed": 45.5
}
```

**Leave a session:**
```json
{
  "type": "leave"
}
```

## Database Schema

The application uses SQLite with the following tables:

- **users**: User accounts
- **sessions**: Skiing sessions
- **session_participants**: Links users to sessions
- **positions**: GPS position history
- **stats**: Aggregated statistics per user per session

## Example Usage

1. Create a user:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username":"skier1","email":"skier1@example.com"}'
```

2. Create a session:
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Morning Run","creator_id":1,"location":"Alps"}'
```

3. Update position:
```bash
curl -X POST http://localhost:3000/api/positions \
  -H "Content-Type: application/json" \
  -d '{"session_id":1,"user_id":1,"latitude":46.5,"longitude":7.5,"altitude":2500,"speed":45.5}'
```

4. View leaderboard:
```bash
curl http://localhost:3000/api/stats/leaderboard/speed
```

## Technology Stack

- **Node.js** & **Express.js**: Backend framework
- **SQLite3**: Database
- **WebSocket (ws)**: Real-time communication
- **CORS**: Cross-origin resource sharing
- **Body-parser**: Request body parsing

## License

ISC