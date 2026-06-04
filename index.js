import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { roomRouter } from './routes/rooms.js';
import { transcribeRouter } from './routes/transcribe.js';
import { translateRouter } from './routes/translate.js';
import { audioRouter } from './routes/audio.js';
import { supabaseRelay } from './services/supabaseRelay.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS blocked: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Health ────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    ts: new Date().toISOString(),
    supabase: !!process.env.SUPABASE_URL,
    openai: !!process.env.OPENAI_API_KEY,
  });
});

// ── Routes ────────────────────────────────────────────
app.use('/api/rooms',     roomRouter);
app.use('/api/transcribe', transcribeRouter);   // POST audio → text (Whisper)
app.use('/api/translate',  translateRouter);    // POST text  → translated text
app.use('/api/audio',     audioRouter);         // POST audio upload → relay URL

// ── Error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Supabase Realtime relay (server-side presence) ────
supabaseRelay.init();

server.listen(PORT, () => {
  console.log(`SatChat backend running on http://localhost:${PORT}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL ? '✓' : '✗ not configured'}`);
  console.log(`OpenAI:   ${process.env.OPENAI_API_KEY ? '✓' : '✗ not configured'}`);
});

export { app, server };
