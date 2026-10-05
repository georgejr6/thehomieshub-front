// Studio autosave: every change is written to localStorage right away (so a
// refresh/crash loses nothing) and pushed to the server after a quiet period.
// One save in flight at a time; a change during a save queues one more.

// A 4xx from the server (bad layers, blocked text, too many designs…) won't fix
// itself by retrying: autosave stops and reports 'fatal' with the server message
// until the next change. flush() rejects when the save failed.
export function createAutosaver({ storageKey, save, delay = 5000, storage = globalThis.localStorage, onStatus = () => {} }) {
  let timer = null;
  let pending = null;
  let inFlight = null;
  let lastSaved = null;
  let lastError = null;
  const isClientError = (e) => { const st = e?.response?.status; return st >= 400 && st < 500 && st !== 408 && st !== 429; };

  const writeLocal = (state) => {
    try { storage?.setItem(storageKey, JSON.stringify({ state, at: Date.now() })); } catch { /* private mode / quota */ }
  };

  async function run() {
    timer = null;
    if (!pending || !save) return;
    if (inFlight) return; // the running save re-checks `pending` when it ends
    const state = pending;
    pending = null;
    const json = JSON.stringify(state);
    if (json === lastSaved) { onStatus('saved'); return; }
    onStatus('saving');
    lastError = null;
    inFlight = Promise.resolve()
      .then(() => save(state))
      .then(() => { lastSaved = json; onStatus('saved'); })
      .catch((e) => {
        lastError = e;
        if (isClientError(e)) { onStatus('fatal', e); return; }
        if (!pending) pending = state;
        onStatus('error', e);
      })
      .finally(() => {
        inFlight = null;
        if (pending && !timer && !isClientError(lastError)) timer = setTimeout(run, delay);
      });
    await inFlight;
  }

  return {
    schedule(state) {
      writeLocal(state);
      pending = state;
      onStatus('dirty');
      clearTimeout(timer);
      timer = setTimeout(run, delay);
    },
    /** Save now; rejects with the error if the save failed. */
    async flush() {
      clearTimeout(timer);
      timer = null;
      if (inFlight) await inFlight;
      if (pending) await run();
      if (lastError) throw lastError;
    },
    cancel() { clearTimeout(timer); timer = null; pending = null; },
    setKey(k) { storageKey = k; },
    /** Write the local copy only (no server save). */
    saveLocal(state) { writeLocal(state); },
    loadLocal() {
      try {
        const raw = JSON.parse(storage?.getItem(storageKey) || 'null');
        return raw && typeof raw === 'object' ? raw : null;
      } catch { return null; }
    },
    clearLocal() { try { storage?.removeItem(storageKey); } catch { /* ignore */ } },
    markSaved(state) { lastSaved = JSON.stringify(state); },
  };
}
