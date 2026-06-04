import { Router } from 'express';
import { openaiClient } from '../services/openai.js';

const router = Router();

// Simple in-memory cache: key = `${src}:${tgt}:${text}` → translated string
// Prevents duplicate API calls for the same content within a session
const cache = new Map();
const CACHE_MAX = 500;

function cacheKey(text, src, tgt) {
  return `${src}:${tgt}:${text.slice(0, 120)}`;
}

// ── POST /api/translate ───────────────────────────────
// Body: { text, sourceLang?, targetLang }
// Response: { text, translatedText, sourceLang, targetLang, cached, engine }
//
// sourceLang: BCP-47 code, e.g. 'en', 'ja'. Omit for auto-detect.
// targetLang: required, e.g. 'ja' or 'en'
router.post('/', async (req, res, next) => {
  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    if (!targetLang || typeof targetLang !== 'string') {
      return res.status(400).json({ error: 'targetLang is required (e.g. "ja" or "en")' });
    }
    if (text.trim().length === 0) {
      return res.json({ text, translatedText: text, sourceLang, targetLang, cached: false, engine: 'passthrough' });
    }

    // Don't translate if source == target
    if (sourceLang && sourceLang === targetLang) {
      return res.json({ text, translatedText: text, sourceLang, targetLang, cached: false, engine: 'same' });
    }

    const key = cacheKey(text, sourceLang || 'auto', targetLang);
    if (cache.has(key)) {
      return res.json({
        text,
        translatedText: cache.get(key),
        sourceLang: sourceLang || 'auto',
        targetLang,
        cached: true,
        engine: 'openai-cached',
      });
    }

    const openai = openaiClient();
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured — set OPENAI_API_KEY' });
    }

    const langNames = { en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', fr: 'French', de: 'German', es: 'Spanish', ne: 'Nepali', ar: 'Arabic', hi: 'Hindi' };
    const targetName = langNames[targetLang] || targetLang;
    const srcName = sourceLang ? (langNames[sourceLang] || sourceLang) : 'the source language';

    const systemPrompt = sourceLang
      ? `Translate from ${srcName} to ${targetName}. Reply with only the translated text. Preserve punctuation and tone.`
      : `Detect the language and translate to ${targetName}. Reply with only the translated text. Preserve punctuation and tone.`;

    console.log(`[translate] ${text.slice(0, 40)}… → ${targetLang}`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 600,
      temperature: 0,
    });

    const translatedText = completion.choices[0]?.message?.content?.trim() || text;

    // Cache the result
    if (cache.size >= CACHE_MAX) {
      // Evict oldest entry
      cache.delete(cache.keys().next().value);
    }
    cache.set(key, translatedText);

    res.json({
      text,
      translatedText,
      sourceLang: sourceLang || 'auto',
      targetLang,
      cached: false,
      engine: 'openai',
    });
  } catch (err) {
    console.error('[translate] error:', err.message);
    next(err);
  }
});

export { router as translateRouter };
