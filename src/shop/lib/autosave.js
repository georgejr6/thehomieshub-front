// Studio autosave: every change is written to localStorage right away (so a
// refresh/crash loses nothing) and pushed to the server after a quiet period.
// One save in flight at a time; a change during a save queues one more.

export function createAutosaver({ storageKey, save, delay = 5000, storage = globalThis.localStorage, onStatus = () => {} }) {
  let timer = null;
  let pending = null;
  let inFlight = null;
  let lastSaved = null;

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
    inFlight = Promise.resolve()
      .then(() => save(state))
      .then(() => { lastSaved = json; onStatus('saved'); })
      .catch(() => { if (!pending) pending = state; onStatus('error'); })
      .finally(() => {
        inFlight = null;
        if (pending && !timer) timer = setTimeout(run, delay);
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
    /** Save now (e.g. before leaving / adding to cart). */
    async flush() {
      clearTimeout(timer);
      timer = null;
      if (inFlight) await inFlight;
      if (pending) await run();
    },
    cancel() { clearTimeout(timer); timer = null; pending = null; },
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
