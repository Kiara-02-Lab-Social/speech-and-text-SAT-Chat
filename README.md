# SatChat Backend

Node.js + Express server for SatChat. Handles audio relay, Whisper transcription, translation, and room management.

---

## Quick start

```bash
cd satchat-backend
cp .env.example .env
# edit .env with your Supabase + OpenAI keys

npm install
npm run dev
```

Server starts at `http://localhost:3000`.

---

## What this does

The frontend (satchat-v1.0.html) connects **directly** to Supabase Realtime for peer-to-peer messaging — no backend required for that.

This backend adds:

| Endpoint | Purpose |
|---|---|
| `POST /api/rooms` | Create or join a named room |
| `POST /api/transcribe` | Send audio → get Whisper transcript |
| `POST /api/translate` | Send text → get translated text (gpt-4o-mini) |
| `POST /api/audio/upload` | Store audio blob → get relay URL (5-min TTL) |
| `GET /api/audio/:id` | Partner fetches audio by relay URL |
| `GET /health` | Health check |

The audio relay solves Supabase Broadcast's payload size limit — blobs upload here instead of going through WebSocket.

---

## Supabase setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste contents of `supabase-schema.sql` → Run
3. Go to Settings → API Keys → copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/publishable key** → for the frontend HTML
   - **service_role key** → `SUPABASE_SERVICE_KEY` (backend only, never in frontend)
4. Go to Realtime → enable Broadcast → allow anonymous access

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Yes | service_role key (server-side only) |
| `OPENAI_API_KEY` | Yes | for Whisper STT and gpt-4o-mini translation |
| `PORT` | No | default 3000 |
| `ALLOWED_ORIGINS` | No | comma-separated CORS origins |
| `MAX_AUDIO_BYTES` | No | default 10MB |
| `SERVER_API_KEY` | No | if set, all /api routes require Bearer auth |

---

## File structure

```
satchat-backend/
├── src/
│   ├── index.js                 — Express server, routes, startup
│   ├── routes/
│   │   ├── rooms.js             — Room create/join/leave/delete
│   │   ├── transcribe.js        — Whisper STT endpoint
│   │   ├── translate.js         — gpt-4o-mini translation endpoint
│   │   └── audio.js             — Audio blob relay (upload + fetch)
│   ├── services/
│   │   ├── openai.js            — Shared OpenAI client singleton
│   │   └── supabaseRelay.js     — Server-side Supabase Realtime connection
│   └── middleware/
│       └── auth.js              — Optional API key protection
├── supabase-schema.sql          — Run once in Supabase SQL Editor
├── package.json
└── .env.example
```

---

## Deploy to Railway / Render / Fly.io

```bash
# Railway
railway login && railway init && railway up

# Render — connect GitHub repo, set env vars in dashboard

# Fly.io
fly launch && fly secrets set SUPABASE_URL=... OPENAI_API_KEY=...
```

All platforms support Node 20 out of the box.

---

## Connecting the frontend

In `satchat-v1.0.html` settings:
- **Supabase URL** → your project URL
- **Supabase anon key** → publishable/anon key (not service_role)

If using the backend audio relay (for large audio files), update the frontend to `POST /api/audio/upload` instead of base64-encoding blobs inline. The backend URL can be hardcoded or set in the HTML settings.

---

## What's NOT stored

- No message content is stored anywhere
- No user accounts or authentication
- Audio blobs expire after 5 minutes
- Room metadata (name, active time) optionally stored in Supabase DB
