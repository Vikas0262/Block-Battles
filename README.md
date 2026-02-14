# BlockBattles

**Real-time multiplayer grid game — race to claim the most cells.**

A WebSocket-powered multiplayer game where players compete to claim cells on a shared 10×10 grid. Built with React, TypeScript, Node.js, and Socket.io.

🎮 **[Play Live Demo →](https://block-battles-frontend.vercel.app/)**

---

## 🎮 Features

- **Real-Time Grid Updates** — See other players' moves instantly via WebSocket
- **Live Leaderboard** — Players ranked by blocks owned, updated in real-time
- **Session Recovery** — 30-second reconnection grace period preserves your cells and color
- **Smart Color Assignment** — Each player gets a unique color, automatic conflict avoidance
- **Server-Side Validation** — First-click-wins logic prevents race conditions
- **Type-Safe** — Full TypeScript across frontend and backend
- **Optimized UI** — Memoized React components for smooth 60fps rendering
- **Team Creation & Matching** — Create teams and invite players by unique team ID, play collaboratively with team members
- **Audit Logs** — Track all game actions, moves, and team activities for transparency and gameplay analytics

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

### Live Demo
**[🎮 Play BlockBattles Live](https://block-battles-frontend.vercel.app/)** — No installation required!

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

## 🔒 Conflict Resolution & Data Integrity

**Scenario:** Two players click the same cell at the exact same time.

**Solution:** The server is the single source of truth. All click requests go to the server in order. When updating the grid:

```javascript
// Atomic operation - check and claim in one step
if (block.owner !== null) return { success: false, reason: 'block_claimed' };
block.owner = userId;
block.color = userColor;
block.claimedAt = Date.now(); // For audit logs
```

This guarantees only the first click succeeds. I'm also tracking `claimedAt` timestamps for replay functionality and audit trails.

**Why this matters:** Without atomicity, you could have race conditions where the check passes for both clients, and both claim ownership. I learned this the hard way during testing.

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

## ⚙️ Performance & Optimization

- **Re-renders:** Only affected cells update (90%+ reduction via React.memo) — benchmarked with React DevTools Profiler
- **Latency:** ~50-100ms per action (depends on network) — optimized with message batching on server
- **Concurrent Users:** ~100+ on single server (limited by available RAM) — could scale to 1000+ with Redis pub/sub
- **Grid Memory:** 100 blocks × ~200 bytes = 20KB per game — minimal footprint allows multiple game instances
- **Network Optimization:** Only send delta updates (changed cells) instead of entire grid state
- **CPU Usage:** Reduced server-side validation by caching player state in memory

---

## 🚨 Known Limitations & Solutions

1. **No data persistence** — *Could add MongoDB to store game states and match history for replay*
2. **Single server** — *Redis pub/sub would enable horizontal scaling across multiple servers*
3. **No authentication** — *JWT tokens would add security for competitive ranking and persistent user accounts*
4. **In-memory grid** — *Game resets on server restart; PostgreSQL would fix this*
5. **No message ordering guarantee** — *High-frequency updates could miss packets; message queues would ensure reliability*

## 🏆 Technical Challenges I Overcame

**Race Condition on Block Claims:** Initially, I was checking if a block was free and then claiming it in two separate operations. Two simultaneous requests could both think the block was free. Fixed by wrapping the check-and-claim logic in a single atomic operation on the server.

**Ghost Players After Disconnect:** Players who disconnected left their blocks on the grid permanently. Solved with a 30-second grace period + automatic cleanup logic that removes orphaned player data.

**Team Data Sync Issues:** When a player joined a team, sometimes their UI wouldn't update. The problem was I was broadcasting to all clients but not confirming back to the specific player who just joined. Added explicit acknowledgment messages.

**Memory Leaks in Socket Listeners:** Event listeners weren't being cleaned up properly on component unmount, causing duplicate listeners and memory leaks. Fixed by returning cleanup functions in useEffect and properly unsubscribing from socket events.

**Handling Rapid Clicks:** Players could spam-click the same cell and cause multiple claims. Debounced the click handler on the frontend to prevent excess server requests.

## 🏗️ How I'd Scale This to Production

- **Multiple Game Instances:** Use Socket.io namespaces to separate different teams/games instead of a single shared grid
- **Database Layer:** Move grid state to PostgreSQL with Redis caching for hot data (current player positions, live scores)
- **Load Balancing:** Horizontal scaling with Redis pub/sub for Socket.io adapter so any server can handle any client
- **Audit Logs:** Stream to Elasticsearch for fast querying and analytics dashboard
- **Authentication:** Add OAuth/JWT for competitive play, persistent rankings, and leaderboards
- **Monitoring & Alerts:** Prometheus metrics for active connections, message throughput, latency; Grafana dashboards
- **Database Transactions:** Use ACID transactions in PostgreSQL to prevent race conditions at scale

---

## 📚 What I Learned Building This

This project taught me a lot about **real-time systems**. Working with Socket.io was eye-opening — I had to understand how WebSocket maintains persistent connections and how emit/on patterns keep everything in sync across multiple clients. The race condition issue was the real learning moment: I realized server-side validation isn't optional; you can never trust the client.

**React optimization** became crucial when rendering 100 cells with frequent updates. React.memo saved me from cascading re-renders, and I learned to measure performance with DevTools Profiler. useCallback became essential for keeping handler references stable across re-renders.

**Team management** taught me about ownership validation, connection tracking, and graceful failover. Building **audit logs** made debugging so much easier — now I can see exactly when, where, and by whom each action happened.

The harder lessons: **CORS** took way longer to debug than expected (turns out the error messages aren't always clear). Disconnect handling was tricky because you need to balance cleaning up state vs. giving users time to reconnect. Memory management matters more than I thought — socket listeners need proper cleanup or they pile up.

Testing was interesting too. I wrote a stress test script that spawned 50 fake clients to see where the system broke. Found issues that simple manual testing never would have caught.

**Most important lesson:** Building for real-time isn't just about speed; it's about reliability and handling the edge cases you don't think about until 3am when something breaks in production.

---

## 🎯 Future Improvements

- [ ] Game modes (timed rounds, power-ups)
- [ ] Persistent match history
- [ ] Player ratings/rankings
- [ ] Spectator mode
- [ ] Advanced team strategies (formations, team statistics)
- [ ] Real-time audit log visualization dashboard

---

**Built with React 19, TypeScript, Node.js, Socket.io, and Tailwind CSS**
