import { useCallback, useState } from 'react';

// Undo/redo for the Studio document. `commit` pushes a snapshot; `preview`
// updates the live state without a history entry (used while dragging).
export const HISTORY_LIMIT = 80;

export function historyReducer(h, action) {
  switch (action.type) {
    case 'commit': {
      // `state` may be an updater: applied to the latest present inside setState,
      // so back-to-back commits (multi-file upload) never drop each other.
      const next = typeof action.state === 'function' ? action.state(h.present) : action.state;
      if (JSON.stringify(next) === JSON.stringify(h.present)) return h;
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
    }
    case 'undo': {
      if (!h.past.length) return h;
      return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
    }
    case 'redo': {
      if (!h.future.length) return h;
      return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
    }
    case 'reset':
      return { past: [], present: action.state, future: [] };
    default:
      return h;
  }
}

export default function useHistory(initial) {
  const [h, setH] = useState({ past: [], present: initial, future: [] });
  const dispatch = useCallback((a) => setH((prev) => historyReducer(prev, a)), []);
  return {
    state: h.present,
    commit: useCallback((state) => dispatch({ type: 'commit', state }), [dispatch]),
    undo: useCallback(() => dispatch({ type: 'undo' }), [dispatch]),
    redo: useCallback(() => dispatch({ type: 'redo' }), [dispatch]),
    reset: useCallback((state) => dispatch({ type: 'reset', state }), [dispatch]),
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
  };
}
