// Homies Chat realtime client for /ws/chat (see homieshub-backend
// utils/chat/gateway.js). Handles identify, reconnect with backoff, resume
// (replays events missed during a short drop), and nonce-matched acks so a
// send can be awaited like a request.

const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://backend.thehomies.app';
const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];

export class ChatSocket {
  constructor({ getToken, onEvent, onStatus }) {
    this.getToken = getToken;
    this.onEvent = onEvent;
    this.onStatus = onStatus;
    this.ws = null;
    this.lastSeq = null;
    this.attempt = 0;
    this.closedByUs = false;
    this.pending = new Map(); // nonce -> { resolve, timer }
    this.nonceN = 0;
  }

  connect() {
    this.closedByUs = false;
    const token = this.getToken();
    if (!token) return this.onStatus('unauthorized');
    this.onStatus(this.lastSeq === null ? 'connecting' : 'reconnecting');
    const ws = new WebSocket(`${WS_BASE}/ws/chat`);
    this.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ op: 'identify', d: { token, ...(this.lastSeq !== null ? { lastSeq: this.lastSeq } : {}) } }));
    };

    ws.onmessage = (ev) => {
      let f;
      try { f = JSON.parse(ev.data); } catch { return; }
      if (f.s) this.lastSeq = f.s;
      const { op, d } = f;
      if (op === 'ready') {
        this.attempt = 0;
        if (!d.resumed) this.lastSeq = d.seq;
        this.onStatus('connected');
      }
      if (op === 'resume_failed') this.onEvent('resync', {});
      if (op === 'invalid_session') {
        this.closedByUs = d?.reason !== 'identify_timeout';
        this.onStatus(d?.reason === 'invalid_token' || d?.reason === 'no_user' ? 'unauthorized' : d?.reason || 'error', d);
      }
      if (op === 'ack' && d?.nonce && this.pending.has(d.nonce)) {
        const p = this.pending.get(d.nonce);
        clearTimeout(p.timer);
        this.pending.delete(d.nonce);
        p.resolve(d);
      }
      this.onEvent(op, d);
    };

    ws.onclose = (ev) => {
      if (this.ws !== ws) return;
      // 4004 kick → may reconnect; 4005 ban → stop.
      if (this.closedByUs || ev.code === 4005) return this.onStatus(ev.code === 4005 ? 'banned' : 'closed');
      const wait = BACKOFF_MS[Math.min(this.attempt++, BACKOFF_MS.length - 1)];
      this.onStatus('reconnecting');
      this.retryTimer = setTimeout(() => this.connect(), wait);
    };
    ws.onerror = () => {};
  }

  send(op, d) {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({ op, d }));
      return true;
    }
    return false;
  }

  nextNonce() {
    return `${Date.now().toString(36)}-${(++this.nonceN).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Resolves with the ack payload ({message} or {error}); rejects if the
  // socket isn't open or no ack arrives (caller falls back to REST).
  request(op, d, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (!this.send(op, d)) return reject(new Error('offline'));
      const timer = setTimeout(() => {
        this.pending.delete(d.nonce);
        reject(new Error('timeout'));
      }, timeoutMs);
      this.pending.set(d.nonce, { resolve, timer });
    });
  }

  close() {
    this.closedByUs = true;
    clearTimeout(this.retryTimer);
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    try { this.ws?.close(); } catch { /* already closed */ }
  }
}
