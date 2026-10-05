import { fetchFonts } from '@/shop/lib/api';
import { registerFonts, allFonts } from '@/shop/studio/model';

// The shared font registry (GET /merch/fonts) must be loaded before anything
// is saved or exported, so a design's font key is never unknown (serverLayer
// refuses unknown keys rather than swapping the font).
let ready = null;
export function ensureFontRegistry() {
  if (!ready) {
    ready = fetchFonts().then((list) => { if (list?.length) registerFonts(list); return allFonts(); })
      .catch(() => { ready = null; return allFonts(); });
  }
  return ready;
}
