import { Router } from 'express';
import multer from 'multer';
import { openaiClient } from '../services/openai.js';
import { toFile } from 'openai';

const router = Router();

const MAX_BYTES = parseInt(process.env.MAX_AUDIO_BYTES || '10485760'); // 10MB default

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav'];
    // Accept if mime starts with audio/ or is a known type
    if (file.mimetype.startsWith('audio/') || allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    }
  },
});

// ── POST /api/transcribe ──────────────────────────────
// multipart/form-data fields:
//   audio  — audio file (required)
//   lang   — BCP-47 language code, e.g. 'ja' or 'en' (optional, auto-detect if omitted)
//   roomId — for logging only (optional)
//
// Response: { text, detectedLanguage, durationSec, model }
router.post('/', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const openai = openaiClient();
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured — set OPENAI_API_KEY' });
    }

    const lang = req.body.lang || null; // null = auto-detect
    const ext = extFromMime(req.file.mimetype);
    const filename = `audio.${ext}`;

    console.log(`[transcribe] ${filename} ${(req.file.size / 1024).toFixed(1)}KB lang=${lang || 'auto'}`);

    const audioFile = await toFile(req.file.buffer, filename, { type: req.file.mimetype });

    const params = {
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json', // gives us language detection
    };
    if (lang) params.language = lang;

    const result = await openai.audio.transcriptions.create(params);

    res.json({
      text: result.text,
      detectedLanguage: result.language || lang || 'unknown',
      durationSec: result.duration || null,
      model: 'whisper-1',
    });
  } catch (err) {
    console.error('[transcribe] error:', err.message);
    next(err);
  }
});

function extFromMime(mime) {
  const map = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
  };
  // Handle 'audio/webm;codecs=opus' style
  const base = mime.split(';')[0].trim();
  return map[base] || 'webm';
}

export { router as transcribeRouter };
