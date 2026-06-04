import { Router } from 'express';
import { v4 as uuid } from 'uuid';

const router = Router();

// In-memory room registry (replace with Supabase DB for persistence)
// Map<roomId, { id, name, createdAt, users: Set<userId> }>
const rooms = new Map();

// Cleanup rooms with no activity for > 24h
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.lastActivity < cutoff) {
      rooms.delete(id);
      console.log(`[rooms] cleaned up stale room: ${id}`);
    }
  }
}, 60 * 60 * 1000); // run every hour

// ── GET /api/rooms/:roomId — check if room exists ──
router.get('/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({
    id: room.id,
    name: room.name,
    userCount: room.users.size,
    createdAt: room.createdAt,
  });
});

// ── POST /api/rooms — create or join a room ──
// Body: { name?: string }
// Returns: { roomId, name, isNew }
router.post('/', (req, res) => {
  const name = (req.body.name || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!name || name.length < 2 || name.length > 64) {
    return res.status(400).json({ error: 'Room name must be 2–64 alphanumeric characters' });
  }

  // Find existing room by name, or create new
  let existing = null;
  for (const r of rooms.values()) {
    if (r.name === name) { existing = r; break; }
  }

  if (existing) {
    existing.lastActivity = Date.now();
    return res.json({ roomId: existing.id, name: existing.name, isNew: false });
  }

  const roomId = uuid();
  const room = {
    id: roomId,
    name,
    createdAt: new Date().toISOString(),
    lastActivity: Date.now(),
    users: new Set(),
  };
  rooms.set(roomId, room);
  console.log(`[rooms] created: ${name} (${roomId})`);
  res.status(201).json({ roomId, name, isNew: true });
});

// ── POST /api/rooms/:roomId/join — track user join ──
router.post('/:roomId/join', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const userId = req.body.userId || uuid();
  room.users.add(userId);
  room.lastActivity = Date.now();
  res.json({ userId, roomId: room.id, userCount: room.users.size });
});

// ── POST /api/rooms/:roomId/leave — track user leave ──
router.post('/:roomId/leave', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(200).json({ ok: true }); // idempotent
  const userId = req.body.userId;
  if (userId) room.users.delete(userId);
  room.lastActivity = Date.now();
  res.json({ userCount: room.users.size });
});

// ── DELETE /api/rooms/:roomId — close a room ──
router.delete('/:roomId', (req, res) => {
  const existed = rooms.delete(req.params.roomId);
  res.json({ deleted: existed });
});

// ── GET /api/rooms — list active rooms (admin/debug) ──
router.get('/', (req, res) => {
  // Only expose in non-production
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const list = Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    userCount: r.users.size,
    createdAt: r.createdAt,
  }));
  res.json({ rooms: list, total: list.length });
});

export { router as roomRouter };
