import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tip } from '@/shop/components/ui';
import { addonDelta } from '@/shop/lib/pricing';

// Add-ons on a listed product: back print, sleeves, embroidered name… Each is
// custom TEXT (docs/MERCH_API_V2.md: add-on text ≤ 40 chars / 2 lines; colours
// are hex; embroidery uses the blank's thread palette and always renders in
// `archivo`). Prices come from the server (cost ÷ 0.67, never below cost).

export const ADDON_TEXT_MAX = 40;
export const ADDON_MAX_LINES = 2;
export const TEXT_FONTS = [
  { key: 'anton', label: 'Block', css: "'HH Anton', Impact, sans-serif", upper: true },
  { key: 'archivo', label: 'Heavy', css: "'HH Archivo', sans-serif", upper: true },
  { key: 'bebas', label: 'Condensed', css: "'HH Bebas', sans-serif", upper: true },
  { key: 'serif_italic', label: 'Script serif', css: "'HH Serif', Georgia, serif", italic: true },
  { key: 'instrument_italic', label: 'Fine serif', css: "'HH Instrument', Georgia, serif", italic: true },
  { key: 'marker', label: 'Marker', css: "'HH Marker', cursive" },
  { key: 'mono', label: 'Mono', css: "'HH Mono', monospace" },
];
export const INK_COLORS = [
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#111111', label: 'Black' },
  { hex: '#F0B94D', label: 'Gold' },
  { hex: '#D62828', label: 'Red' },
];
// Text size for an add-on, as a share of its print area's height (server: fontSize 8–5000 printfile px).
export const ADDON_SIZES = [{ key: 's', label: 'Small', f: 0.12 }, { key: 'm', label: 'Medium', f: 0.2 }, { key: 'l', label: 'Large', f: 0.3 }];
export function addonFontSize(addon, sizeKey, text = '') {
  const step = ADDON_SIZES.find((x) => x.key === sizeKey);
  const h = Number(addon?.area?.height);
  if (!step || !h) return undefined;
  const lines = Math.max(1, String(text).split('\n').length);
  return Math.min(5000, Math.max(8, Math.round((h * step.f) / Math.sqrt(lines))));
}
const fontOf = (k) => TEXT_FONTS.find((f) => f.key === k) || TEXT_FONTS[0];
export const isEmbroidery = (addon) => /embroid/i.test(`${addon?.technique || ''} ${addon?.key || ''}`);
export const clampAddonText = (t) => String(t ?? '').split('\n').slice(0, ADDON_MAX_LINES).join('\n').slice(0, ADDON_TEXT_MAX);

/** Closest palette colour to white/black so the default reads on the garment. */
export function defaultColor(palette, darkGarment) {
  if (!palette.length) return null;
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114; };
  return [...palette].sort((a, b) => (darkGarment ? lum(b.hex) - lum(a.hex) : lum(a.hex) - lum(b.hex)))[0].hex;
}

/** value: { [addonKey]: { on, text, font, color } }. threadColors: [{hex,name}] from /blanks. */
export default function AddonsPanel({ addons = [], value, onChange, threadColors = [], garmentHex = '#f5f5f2', darkGarment = false, highlight = false }) {
  if (!addons.length) return null;
  const set = (key, patch) => onChange({ ...value, [key]: { ...(value[key] || {}), ...patch } });
  return (
    <div className={cn('space-y-3 rounded-3xl transition-shadow', highlight && 'shadow-[0_0_0_2px_rgba(240,185,77,0.6)]')} id="customize">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Customize it</p>
        <p className="text-xs text-white/45">Optional · printed just for you</p>
      </div>
      {addons.map((a) => {
        const v = value[a.key] || {};
        const emb = isEmbroidery(a);
        const palette = emb ? threadColors.map((t) => ({ hex: t.hex.toUpperCase(), label: t.name || t.hex })) : INK_COLORS;
        const unavailable = emb && !palette.length;
        const color = v.color || defaultColor(palette, darkGarment);
        const font = emb ? fontOf('archivo') : fontOf(v.font || 'anton');
        return (
          <div key={a.key} className={cn('overflow-hidden rounded-2xl border transition-colors', v.on ? 'border-white/30 bg-white/[0.04]' : 'border-white/10', unavailable && 'opacity-50')}>
            <button type="button" aria-expanded={!!v.on} disabled={unavailable} onClick={() => set(a.key, { on: !v.on, color, font: emb ? 'archivo' : (v.font || 'anton') })}
              className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-not-allowed">
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition', v.on ? 'border-[#f0b94d] bg-[#f0b94d] text-black' : 'border-white/25 text-white/60')}>
                {v.on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block text-xs text-white/45">{unavailable ? 'Unavailable right now' : emb ? 'Embroidered text' : 'Your text, printed'}</span>
              </span>
              <span className="text-sm font-semibold text-[#f0b94d]">{addonDelta(a.priceCents)}</span>
            </button>
            <AnimatePresence initial={false}>
              {v.on && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="space-y-4 border-t border-white/[0.07] px-4 pb-4 pt-4">
                    <div>
                      <label htmlFor={`addon-${a.key}`} className="mb-1.5 block text-xs font-semibold text-white/60">{emb ? 'Name or short text' : 'Your text'} <span className="font-normal text-white/35">· up to 2 lines</span></label>
                      <div className="relative">
                        <textarea id={`addon-${a.key}`} rows={2} value={v.text || ''} onChange={(e) => set(a.key, { text: clampAddonText(e.target.value) })}
                          placeholder={emb ? 'BIG HOMIE' : 'MEDELLÍN 2026'}
                          className="w-full resize-none rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 pr-14 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none" />
                        <span className="absolute bottom-2.5 right-3 text-[11px] tabular-nums text-white/35">{(v.text || '').length}/{ADDON_TEXT_MAX}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white/35">{(v.text || '').split('\n').length}/{ADDON_MAX_LINES} lines · Enter for a new line</span>
                        <button type="button" disabled={(v.text || '').split('\n').length >= ADDON_MAX_LINES || !(v.text || '').trim()}
                          onClick={() => set(a.key, { text: clampAddonText(`${v.text || ''}\n`) })}
                          className="h-8 rounded-full border border-white/12 px-3 text-[11px] font-semibold text-white/70 hover:border-white/35 disabled:opacity-30">+ Line break</button>
                      </div>
                    </div>
                    {!emb && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-white/60">Font</p>
                        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                          {TEXT_FONTS.map((f) => (
                            <button key={f.key} type="button" aria-pressed={(v.font || 'anton') === f.key} onClick={() => set(a.key, { font: f.key })}
                              className={cn('h-10 shrink-0 rounded-xl border px-3 text-sm', (v.font || 'anton') === f.key ? 'border-white bg-white text-black' : 'border-white/12 text-white/80')}
                              style={{ fontFamily: f.css, fontStyle: f.italic ? 'italic' : 'normal', textTransform: f.upper ? 'uppercase' : 'none' }}>{f.label}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {a.area?.height > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-white/60">Size</p>
                        <div className="flex gap-2" role="group" aria-label="Text size">
                          {ADDON_SIZES.map((z) => (
                            <button key={z.key} type="button" aria-pressed={(v.size || 'm') === z.key} onClick={() => set(a.key, { size: z.key })}
                              className={cn('h-10 rounded-xl border px-4 text-sm', (v.size || 'm') === z.key ? 'border-white bg-white text-black' : 'border-white/12 text-white/80')}>{z.label}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-white/60">{emb ? 'Thread' : 'Ink'} <span className="font-normal text-white/35">· {palette.find((c) => c.hex === color)?.label}</span></p>
                      <div className="flex flex-wrap gap-2.5">
                        {palette.map((c) => (
                          <button key={c.hex} type="button" aria-label={c.label} aria-pressed={color === c.hex} title={c.label} onClick={() => set(a.key, { color: c.hex })}
                            className={cn('h-9 w-9 rounded-full ring-offset-2 ring-offset-[#0a0a0b]', color === c.hex ? 'ring-2 ring-white' : 'ring-1 ring-white/20')} style={{ background: c.hex }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex min-h-[96px] items-center justify-center overflow-hidden rounded-xl px-4 py-3" style={{ background: garmentHex }} aria-label="Preview">
                      <span className="max-w-full whitespace-pre-line break-words text-center text-3xl leading-[1.05]"
                        style={{ fontFamily: font.css, fontStyle: font.italic ? 'italic' : 'normal', color, textTransform: font.upper ? 'uppercase' : 'none', fontSize: { s: 22, m: 30, l: 40 }[v.size || 'm'] }}>
                        {(v.text || '').trim() || (emb ? 'YOUR NAME' : 'Your text')}
                      </span>
                    </div>
                    {emb && <Tip>Embroidery is stitched — keep it short for the cleanest result.</Tip>}
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

/** Panel state → cart add-ons ({ addons, error }). Text only; colours hex. */
export function toCartAddons(addons = [], value = {}, threadColors = [], darkGarment = false) {
  const out = [];
  for (const a of addons) {
    const v = value[a.key];
    if (!v?.on) continue;
    const emb = isEmbroidery(a);
    const text = clampAddonText(v.text).trim();
    if (!text) return { addons: [], error: `Add your text for “${a.label}” or turn it off.` };
    const palette = emb ? threadColors.map((t) => ({ hex: String(t.hex).toUpperCase() })) : INK_COLORS;
    const color = (v.color || defaultColor(palette, darkGarment) || '').toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(color)) return { addons: [], error: `Pick a colour for “${a.label}”.` };
    const fontSize = v.size ? addonFontSize(a, v.size, text) : (Number.isInteger(v.fontSize) ? v.fontSize : undefined);
    out.push({ key: a.key, label: a.label, text, font: emb ? 'archivo' : (v.font || 'anton'), color, ...(fontSize ? { fontSize } : {}), priceCents: a.priceCents || 0 });
  }
  return { addons: out, error: null };
}

/** Cart add-ons → panel state (edit in place). */
export const fromCartAddons = (cartAddons = []) => Object.fromEntries(cartAddons.map((a) => [a.key, { on: true, text: a.text || '', font: a.font, color: a.color, fontSize: a.fontSize }]));
