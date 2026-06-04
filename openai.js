import OpenAI from 'openai';

let _client = null;

/**
 * Returns a shared OpenAI client, or null if OPENAI_API_KEY is not set.
 * Callers should check for null and return 503 if OpenAI is required.
 */
export function openaiClient() {
  if (_client) return _client;
  if (!process.env.OPENAI_API_KEY) return null;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}
