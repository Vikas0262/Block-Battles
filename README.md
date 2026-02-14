# BlockBattles

**Real-time multiplayer grid game — race to claim the most cells.**

A WebSocket-powered multiplayer game where players compete to claim cells on a shared 10×10 grid. Built with React, TypeScript, Node.js, and Socket.io.

---

## 🎮 Features

- **Real-Time Grid Updates** — See other players' moves instantly via WebSocket
- **Live Leaderboard** — Players ranked by blocks owned, updated in real-time
- **Session Recovery** — 30-second reconnection grace period preserves your cells and color
- **Smart Color Assignment** — Each player gets a unique color, automatic conflict avoidance
- **Server-Side Validation** — First-click-wins logic prevents race conditions
- **Type-Safe** — Full TypeScript across frontend and backend
- **Optimized UI** — Memoized React components for smooth 60fps rendering

---

## 🛠️ Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Socket.io Client (WebSocket)
- React Router (navigation)

**Backend:**
- Node.js + Express
- Socket.io (real-time server)
- CORS (cross-origin support)

**Data Storage:** In-memory grid state (no database)

---

## ⚡ How Real-Time Works

1. **Player clicks a cell** on their local grid
2. **Browser sends claim request** via WebSocket to server
3. **Server validates** — Is the block unclaimed? Does the user exist?
4. **Transfer ownership** — If valid, update grid state and player stats
5. **Broadcast to all clients** — All connected players receive updated grid
6. **UI updates instantly** — Only affected cells re-render (optimized with React.memo)

**Conflict resolution:** If two players click the same cell simultaneously, the server processes them in order. Only the first request succeeds; the second gets rejected.

---

## 📦 Project Structure

```
backend/
  ├── src/
  │   ├── server.js              # Express + Socket.io server
  │   ├── sockets/
  │   │   └── socketHandlers.js  # Real-time event handlers
  │   └── utils/
  │       └── gridManager.js     # Grid state & block ownership
  └── package.json

frontend/
  ├── src/
  │   ├── pages/              # Home (join) + Game (play)
  │   ├── components/         # Grid cells, leaderboard, etc
  │   ├── context/            # User state management
  │   ├── services/           # Socket.io connection
  │   └── App.tsx             # Router
  └── package.json
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+ and npm

### Step 1: Install Dependencies

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Step 2: Configure Environment

**Backend** — Create `backend/.env`:
```
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Frontend** — Create `frontend/.env`:
```
VITE_BACKEND_URL=http://localhost:3000
```

### Step 3: Run Both Servers

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` (Backend) | Server port | 3000 |
| `NODE_ENV` | dev/production mode | development |
| `FRONTEND_URL` (Backend) | Frontend origin for CORS | http://localhost:5173 |
| `VITE_BACKEND_URL` (Frontend) | Backend WebSocket server | http://localhost:3000 |

---

## 📤 Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build          # Creates dist/ folder
# Deploy dist/ folder to Vercel
```

Vercel auto-deploys from GitHub. Set environment variable:
```
VITE_BACKEND_URL = https://your-backend.com
```

### Backend (Railway/Render)

Push code to GitHub. Railway/Render auto-deploys.

Set these environment variables in your hosting dashboard:
```
PORT = 3000 (or auto-assigned)
NODE_ENV = production
FRONTEND_URL = https://your-vercel-site.com
```

---

## 🎮 How to Play

1. **Enter your name** (4+ letters, no numbers)
2. **Click "Start Game"** — Server assigns you a unique color
3. **Click gray cells** to claim them — they turn your color
4. **Watch the leaderboard** — It updates as players claim blocks
5. **Game never ends** — Keep claiming until you own the most cells!

**Rules:**
- 10×10 grid = 100 cells total
- Each player gets a unique color
- Unclaimed cells are gray
- Claimed cells show the first 2 letters of owner's name
- No attacking/stealing opponent cells
- If you disconnect and reconnect within 30 seconds, you keep your cells

---

## 🔒 How Conflicts Are Prevented

**Scenario:** Two players click the same cell at the exact same time.

**Solution:** The server is the single source of truth. All click requests go to the server in order. When updating the grid:

```javascript
// Check if block is still unclaimed
if (block.owner !== null) return { success: false };
// Only then transfer ownership
block.owner = userId;
block.color = userColor;
```

This guarantees only the first click succeeds. The second player sees "Block already claimed."

---

## 📊 Architecture

```
[Player 1] ──┐
[Player 2] ──┼──→ [Express + Socket.io Server] ──→ [Grid State (In-Memory)]
[Player N] ──┘
     ↑─────────────── Real-time Updates via WebSocket ─────────────────↓
```

- **Server** runs the game logic and owns the grid state
- **Clients** send actions (click cell) and receive updates (grid changed)
- **WebSocket** connects players with <100ms latency
- **No database** — state resets when server restarts

---

## ⚙️ Performance

- **Re-renders:** Only affected cells update (90%+ reduction via React.memo)
- **Latency:** ~50-100ms per action (depends on network)
- **Concurrent Users:** ~100+ on single server (limited by available RAM)
- **Grid Memory:** 100 blocks × ~200 bytes = 20KB per game

---

## 🚨 Known Limitations

1. **No data persistence** — Grid resets when server restarts
2. **No database** — Can't replay or save games
3. **Single server** — Limited to ~100 concurrent players
4. **No authentication** — Anonymous players only
5. **No chat** — No player-to-player messaging

---

## 🎯 Future Improvements

- [ ] Game modes (timed rounds, power-ups)
- [ ] Persistent match history
- [ ] Player ratings/rankings
- [ ] Mobile app (touch support)
- [ ] Spectator mode
- [ ] Team-based gameplay

---

**Built with React 19, TypeScript, Node.js, Socket.io, and Tailwind CSS**
