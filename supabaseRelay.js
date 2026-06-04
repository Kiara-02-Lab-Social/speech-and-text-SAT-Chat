import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase Realtime relay.
 *
 * Responsibilities:
 *  1. Maintain a single server-side connection to Supabase Realtime.
 *  2. Subscribe to all `satchat:*` channels to monitor activity.
 *  3. Clean up stale presence entries when users disconnect without calling leave.
 *  4. Optionally persist message metadata (not content) to Supabase DB for analytics.
 *
 * The frontend clients connect directly to Supabase Realtime using their anon key.
 * This relay handles server-side concerns only.
 */
class SupabaseRelay {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.channels = new Map(); // roomName → channel
  }

  init() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY not set — relay disabled');
      return;
    }

    this.client = createClient(url, key, {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      auth: { persistSession: false },
    });

    this.initialized = true;
    console.log('[supabase] relay initialised');
  }

  /**
   * Subscribe the server to a room's broadcast channel.
   * Called when the first user joins a room via POST /api/rooms.
   */
  subscribeToRoom(roomName) {
    if (!this.initialized) return;
    if (this.channels.has(roomName)) return; // already subscribed

    const channel = this.client.channel(`satchat:${roomName}`, {
      config: { broadcast: { ack: false } },
    });

    channel
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        this._onMessage(roomName, payload);
      })
      .on('presence', 'join', ({ key }) => {
        console.log(`[supabase] room=${roomName} user=${key} joined`);
      })
      .on('presence', 'leave', ({ key }) => {
        console.log(`[supabase] room=${roomName} user=${key} left`);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[supabase] subscribed to room: ${roomName}`);
        }
      });

    this.channels.set(roomName, channel);
  }

  /**
   * Unsubscribe the server from a room channel.
   * Called when a room is deleted or expires.
   */
  async unsubscribeFromRoom(roomName) {
    const channel = this.channels.get(roomName);
    if (!channel) return;
    await this.client.removeChannel(channel);
    this.channels.delete(roomName);
    console.log(`[supabase] unsubscribed from room: ${roomName}`);
  }

  /**
   * Broadcast a server-generated event to a room.
   * E.g. system messages, moderation notices, etc.
   */
  async sendToRoom(roomName, event, payload) {
    if (!this.initialized) return;
    let channel = this.channels.get(roomName);
    if (!channel) {
      this.subscribeToRoom(roomName);
      channel = this.channels.get(roomName);
    }
    await channel.send({
      type: 'broadcast',
      event,
      payload: { ...payload, _server: true, ts: Date.now() },
    });
  }

  /**
   * Handle incoming messages for logging / analytics.
   * Does NOT store message content — only metadata.
   */
  _onMessage(roomName, payload) {
    const meta = {
      room: roomName,
      type: payload.type,
      userId: payload.userId,
      ts: Date.now(),
      hasAudio: payload.type === 'audio',
      hasText: !!(payload.text),
    };
    // In production: write meta to Supabase DB analytics table
    // For now: just log
    console.log(`[supabase] msg room=${roomName}`, meta);
  }

  get isReady() {
    return this.initialized && !!this.client;
  }
}

export const supabaseRelay = new SupabaseRelay();
