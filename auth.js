/**
 * Optional API key middleware.
 * If SERVER_API_KEY is set in .env, all /api/* routes require
 * an Authorization: Bearer <key> header.
 *
 * Skip this in local development by leaving SERVER_API_KEY unset.
 */
export function requireApiKey(req, res, next) {
  const serverKey = process.env.SERVER_API_KEY;
  if (!serverKey) return next(); // not enforced

  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token !== serverKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
