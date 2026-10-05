import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tip } from '@/shop/components/ui';
import { addonDelta } from '@/shop/lib/pricing';

// Add-ons on a listed product (back print, sleeve, left-chest name, custom
// text). Prices come from the server (formula: cost ÷ 0.67, never below cost).

export const TEXT_FONTS = [
  { key: 'anton', label: 'Block', css: "'HH Anton', Impact, sans-serif" },
  { key: 'archivo', label: 'Heavy', css: "'HH Archivo', sans-serif" },
  { key: 'serif', label: 'Script serif', css: "'HH Serif', Georgia, serif" },
  { key: 'marker', label: 'Marker', css: "'HH Marker', cursive" },
  { key: 'mono', label: 'Mono', css: "'HH Mono', monospace" },
];
export const INK_COLORS = [
  { key: 'white', label: 'White', hex: '#ffffff' },
  { key: 'black', label: 'Black', hex: '#111111' },
  { key: 'gold', label: 'Gold', hex: '#f0b94d' },
  { key: 'red', label: 'Red', hex: '#d62828' },
];
// Homies thread palette for embroidery (spec).
export const THREAD_COLORS = [
  { key: 'white', label: 'White thread', hex: '#ffffff' },
  { key: 'black', label: 'Black thread', hex: '#111111' },
  { key: 'red', label: 'Red thread', hex: '#cc3333' },
  { key: 'gold', label: 'Gold thread', hex: '#e2a83a' },
  { key: 'navy', label: 'Navy thread', hex: '#1f2a44' },
];
const fontCss = (k) => TEXT_FONTS.find((f) => f.key === k)?.css || TEXT_FONTS[0].css;
const MAX_TEXT = 24;

export const isEmbroidery = (addon) => /embroid/i.test(addon?.technique || addon?.key || '');

/** value: { [addonKey]: { on, mode:'design'|'text', text, font, color } } */
export default function AddonsPanel({ addons = [], value, onChange, designId, garmentHex = '#f5f5f2', darkGarment = false }) {
  if (!addons.length) return null;
  const set = (key, patch) => onChange({ ...value, [key]: { ...(value[key] || {}), ...patch } });
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Make it yours</p>
        <p className="text-xs text-white/45">Optional add-ons</p>
      </div>
      {addons.map((a) => {
        const v = value[a.key] || {};
        const emb = isEmbroidery(a);
        const canDesign = !emb && (a.kind === 'art' || a.kind === 'text_or_art') && !!designId;
        const canText = a.kind === 'text' || a.kind === 'text_or_art' || emb;
        const mode = v.mode || (canDesign ? 'design' : 'text');
        const colors = emb ? THREAD_COLORS : INK_COLORS;
        const color = v.color || (darkGarment ? 'white' : 'black');
        return (
          <div key={a.key} className={cn('overflow-hidden rounded-2xl border transition-colors', v.on ? 'border-white/30 bg-white/[0.04]' : 'border-white/10')}>
            <button type="button" aria-expanded={!!v.on} onClick={() => set(a.key, { on: !v.on, mode, color, font: v.font || (emb ? 'archivo' : 'anton') })}
              className="shop-block flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border transition', v.on ? 'border-[#f0b94d] bg-[#f0b94d] text-black' : 'border-white/25 text-white/60')}>
                {v.on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block text-xs text-white/45">{emb ? 'Embroidered text' : a.kind === 'text' ? 'Your text, printed' : 'Same design or your own text'}</span>
              </span>
              <span className="text-sm font-semibold text-[#f0b94d]">{addonDelta(a.priceCents)}</span>
            </button>
            <AnimatePresence initial={false}>
              {v.on && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                  <div className="space-y-4 border-t border-white/[0.07] px-4 pb-4 pt-4">
                    {canDesign && canText && (
                      <div className="inline-flex rounded-full border border-white/12 p-1 text-xs font-semibold" role="radiogroup" aria-label={`${a.label} content`}>
                        {[['design', 'Same design'], ['text', 'Custom text']].map(([k, l]) => (
                          <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => set(a.key, { mode: k })}
                            className={cn('shop-block rounded-full px-3.5 py-1.5', mode === k ? 'bg-white text-black' : 'text-white/60')}>{l}</button>
                        ))}
                      </div>
                    )}
                    {mode === 'text' && (
                      <>
                        <div>
                          <label htmlFor={`addon-${a.key}`} className="mb-1.5 block text-xs font-semibold text-white/60">{emb ? 'Name or short text' : 'Your text'}</label>
                          <div className="relative">
                            <input id={`addon-${a.key}`} value={v.text || ''} maxLength={MAX_TEXT} onChange={(e) => set(a.key, { text: e.target.value })}
                              placeholder={emb ? 'e.g. BIG HOMIE' : 'e.g. MEDELLÍN 2026'}
                              className="h-11 w-full rounded-xl border border-white/12 bg-black/40 px-3.5 pr-14 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-white/35">{(v.text || '').length}/{MAX_TEXT}</span>
                          </div>
                        </div>
                        {!emb && (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold text-white/60">Font</p>
                            <div className="no-scrollbar flex gap-2 overflow-x-auto">
                              {TEXT_FONTS.map((f) => (
                                <button key={f.key} type="button" aria-pressed={(v.font || 'anton') === f.key} onClick={() => set(a.key, { font: f.key })}
                                  className={cn('shop-block shrink-0 rounded-xl border px-3 py-2 text-sm', (v.font || 'anton') === f.key ? 'border-white bg-white text-black' : 'border-white/12 text-white/80')}
                                  style={{ fontFamily: f.css }}>{f.label}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="mb-1.5 text-xs font-semibold text-white/60">{emb ? 'Thread' : 'Ink'}</p>
                          <div className="flex gap-2.5">
                            {colors.map((c) => (
                              <button key={c.key} type="button" aria-label={c.label} aria-pressed={color === c.key} title={c.label} onClick={() => set(a.key, { color: c.key })}
                                className={cn('shop-block h-8 w-8 rounded-full ring-offset-2 ring-offset-[#0a0a0b]', color === c.key ? 'ring-2 ring-white' : 'ring-1 ring-white/20')} style={{ background: c.hex }} />
                            ))}
                          </div>
                        </div>
                        <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl px-4" style={{ background: garmentHex }} aria-label="Preview">
                          <span className="max-w-full truncate text-center text-3xl leading-none"
                            style={{ fontFamily: emb ? fontCss('archivo') : fontCss(v.font || 'anton'), color: colors.find((c) => c.key === color)?.hex, textTransform: emb || ['anton', 'archivo'].includes(v.font || 'anton') ? 'uppercase' : 'none' }}>
                            {(v.text || '').trim() || (emb ? 'YOUR NAME' : 'Your text')}
                          </span>
                        </div>
                        {emb && <Tip>Embroidery is stitched by hand-guided machines — keep it short (max 2 lines) for the cleanest result.</Tip>}
                      </>
                    )}
                    {mode === 'design' && <Tip>We'll print this same design on the {a.label.toLowerCase().replace(/ print$/, '')}.</Tip>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/** Turn panel state into cart add-ons; returns { addons, error }. */
export function toCartAddons(addons = [], value = {}, designId) {
  const out = [];
  for (const a of addons) {
    const v = value[a.key];
    if (!v?.on) continue;
    const emb = isEmbroidery(a);
    const mode = v.mode || ((a.kind === 'art' || a.kind === 'text_or_art') && designId && !emb ? 'design' : 'text');
    if (mode === 'text') {
      const text = String(v.text || '').trim();
      if (!text) return { addons: [], error: `Add your text for “${a.label}” or turn it off.` };
      out.push({ key: a.key, label: a.label, text: text.slice(0, MAX_TEXT), font: emb ? 'archivo' : (v.font || 'anton'), color: v.color || 'white', priceCents: a.priceCents || 0 });
    } else {
      out.push({ key: a.key, label: a.label, designId, priceCents: a.priceCents || 0 });
    }
  }
  return { addons: out, error: null };
}
