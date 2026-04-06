# Roam.ai

Roam.ai is a local-first full-stack travel planner and social travel companion app. It combines AI-assisted destination planning with booking-style trip flows, traveler discovery, direct messaging, and group chat.

The current setup is designed to run entirely on a local machine for demos and prototyping:

- Frontend: static HTML/CSS/JS
- Backend: Node.js + Express
- Database: SQLite
- Auth: JWT
- Realtime: Socket.io
- Local AI integration: Ollama (qwen2.5:1.5b)

## What The App Does

- `Plan`: asks a travel questionnaire and generates destination recommendations
- `Book`: presents trip-style flight and hotel selections for the chosen destination
- `Enjoy`: generates destination activities and ideas
- `Connect`: lets travelers discover each other, send connection requests, join groups, and chat

## Project Structure

```text
.
|-- public/
|   |-- index.html         # Main UI, styling, and core client logic
|   `-- app.js             # Runtime overrides, connect/chat UI, branding, demo polish
|-- scripts/
|   `-- reseed-demo.js     # Clears and reseeds the local database with demo users/groups/messages
|-- db.js                  # SQLite connection, schema initialization, query helpers
|-- server.js              # Express API, auth, connections, messages, groups, Ollama proxy, Socket.io
|-- package.json           # App scripts and dependencies
|-- .env                   # Local configuration
`-- README.md              # Project overview and setup notes
```

## Local Setup

Install dependencies:

```powershell
npm install
```

Start the app:

```powershell
npm start
```

Open:

```text
http://localhost:3000
```

## Environment

Example `.env` values:

```env
PORT=3000
JWT_SECRET=change-me-before-sharing-this-app
OLLAMA_URL=http://localhost:11434
```

## Demo Data

The app includes a reseed script that wipes the current local SQLite data and inserts a clean demo dataset.

Run:

```powershell
npm run reseed:demo
```

This seeds:

- 18 demo users
- accepted and pending connections
- direct message history
- group memberships
- starter group chat messages

Shared demo password:

```text
DemoTrip123!
```

Recommended demo accounts:

- `maya.chen.demo@xpedition.local`
- `isabella.rossi.demo@xpedition.local`
- `marcus.johnson.demo@xpedition.local`

Suggested demo story:

1. Log into Maya in the main browser window
2. Log into Isabella in an incognito window
3. Show `Plan`, `Book`, and `Enjoy`
4. Open `Connect`
5. Show existing connection state and direct messages
6. Open the shared group and send a group message

## Notes On The Frontend

`public/index.html` is currently the main application surface and contains both legacy and live logic. The active, demo-facing behavior is concentrated in the later override section of the file and in `public/app.js`.

For stability before the demo:

- keep working overrides near the bottom of `public/index.html`
- avoid large refactors to the older inline code unless you plan to fully split the frontend
- prefer small, verified changes in `public/app.js` for demo polish

## Useful Scripts

- `npm start`: start the production-style local server
- `npm run dev`: start with nodemon
- `npm run reseed:demo`: clear and reseed the local demo database

## API Areas

High-level backend areas in `server.js`:

- auth
- user discovery
- connections
- direct messages
- groups
- group chat
- Ollama proxying

## Current Limitations

- The `Plan` stage still depends on a local Ollama model that can vary in quality and latency
- `public/index.html` is larger than ideal and still contains legacy logic from earlier iterations
- Some generated AI recommendations may need additional validation for realism and geographic accuracy
- Booking and activity data are hybrid demo/generated experiences rather than live third-party inventory

## Future Improvements

- Split the frontend into modules or a small framework-based client for maintainability
- Move more client state persistence from `localStorage` to SQLite-backed user state
- Improve AI validation for destination realism, geography, and highlight accuracy
- Add stronger recommendation ranking for social matching
- Add group chat presence, typing state, and read receipts
- Add admin/demo tools for resetting or switching seeded demo sets
- Add tests for auth, connection flows, and recommendation filtering
- Add a cleaner production config layer for model selection and feature flags

## Demo-Ready Focus

This project is currently optimized for:

- local demos
- portfolio walkthroughs
- prototype validation
- experimenting with AI-assisted trip planning and social travel flows

If this were moving toward production, the next biggest win would be separating the oversized client logic into smaller frontend modules and moving the remaining fragile state flows into the backend.
