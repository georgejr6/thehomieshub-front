// Shared helpers for Live v2 replays (LiveStreamPage + VodPage).

// A replay is a list of recorded parts, played in order. Old backends only send
// vodPlaybackId (one part).
export const getVodParts = (s) => {
  if (Array.isArray(s?.vodParts) && s.vodParts.length) {
    return s.vodParts.filter((p) => p && p.playbackId);
  }
  return s?.vodPlaybackId ? [{ playbackId: s.vodPlaybackId, durationSec: s.vodDurationSec || 0 }] : [];
};

// Replays whose stream ended less than this long ago may still gain parts.
export const LATE_PART_WINDOW_MS = 30 * 60 * 1000;

export const endedAgoMs = (endedAt) => {
  const t = endedAt ? new Date(endedAt).getTime() : NaN;
  return Number.isNaN(t) ? Infinity : Date.now() - t;
};

// Where part `index` starts on the stream timeline (seconds from the stream
// start, which is what recorded chat timestamps are measured against). Uses the
// part's createdAt when present (so gaps between parts are right), else the sum
// of the earlier parts' durations.
export const partOffsetSec = (parts, index, streamStartMs) => {
  const part = parts[index];
  const created = part?.createdAt ? new Date(part.createdAt).getTime() : NaN;
  if (!Number.isNaN(created) && streamStartMs && !Number.isNaN(streamStartMs)) {
    return Math.max(0, (created - streamStartMs) / 1000);
  }
  return parts.slice(0, index).reduce((sum, p) => sum + (Number(p.durationSec) || 0), 0);
};

// Poll cadence for a loaded stream/vod. `state` = { count, stable } tracks part
// growth between polls (mutated). Returns ms, or null to stop.
export const vodPollDelay = ({ processing, endedAt, parts }, state) => {
  const count = parts.length;
  if (count !== state.count) { state.count = count; state.stable = 0; } else { state.stable += 1; }
  if (processing || count === 0) return 15000;
  if (endedAgoMs(endedAt) < LATE_PART_WINDOW_MS && state.stable < 2) return 30000;
  return null;
};
