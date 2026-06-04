import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';

const router = Router();

// In-memory audio relay store
// Large audio blobs are too big for Supabase Broadcast payloads.
// Frontend uploads here → gets a short-lived URL → broadcasts the URL to partner → partner fetches.
// Files expire after TTL_MS (default 5 minutes).
const store = new Map(); // Map<id, { buffer, mime, expiresAt, roomId }>
const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_BYTES = parseInt(process.env.MAX_AUDIO_BYTES || '10485760');

// Cleanup expired audio
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) {
      store.delete(id);
    }
  }
}, 60_000);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    file.mimetype.startsWith('audio/') ? cb(null, true) : cb(new Error(`Not audio: ${file.mimetype}`));
  },
});

// ── POST /api/audio/upload ────────────────────────────
// multipart/form-data:
//   audio  — audio blob (required)
//   roomId — room this audio belongs to (optional, for TTL tracking)
//   dur    — duration in seconds (optional)
//
// Response: { audioId, url, expiresAt, sizeBytes }
router.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file' });

  const audioId = uuid();
  const expiresAt = Date.now() + TTL_MS;

  store.set(audioId, {
    buffer: req.file.buffer,
    mime: req.file.mimetype,
    expiresAt,
    roomId: req.body.roomId || null,
    dur: parseFloat(req.body.dur) || null,
  });

  const url = `/api/audio/${audioId}`;
  console.log(`[audio] stored ${audioId} ${(req.file.size / 1024).toFixed(1)}KB ttl=5min`);

  res.status(201).json({
    audioId,
    url,
    expiresAt: new Date(expiresAt).toISOString(),
    sizeBytes: req.file.size,
    dur: parseFloat(req.body.dur) || null,
  });
});

// ── GET /api/audio/:audioId — fetch audio for playback ──
router.get('/:audioId', (req, res) => {
  const entry = store.get(req.params.audioId);
  if (!entry) return res.status(404).json({ error: 'Audio not found or expired' });
  if (entry.expiresAt < Date.now()) {
    store.delete(req.params.audioId);
    return res.status(410).json({ error: 'Audio expired' });
  }

  res.set('Content-Type', entry.mime);
  res.set('Cache-Control', 'private, max-age=300');
  res.set('X-Audio-Duration', entry.dur?.toString() || '');
  res.send(entry.buffer);
});

// ── DELETE /api/audio/:audioId — explicit cleanup ──
router.delete('/:audioId', (req, res) => {
  store.delete(req.params.audioId);
  res.json({ deleted: true });
});

export { router as audioRouter };
