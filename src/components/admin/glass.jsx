import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowUpRight } from 'lucide-react';

// ── Glass design kit for the admin panel ──────────────────────────────────────
// Shared translucent "glass" primitives so every admin page reads as one clean,
// modern surface: frosted panels, big legible text, interactive stat tiles.

// Accent → tailwind color tokens for icon chips, glows, and trends.
const ACCENTS = {
  primary: { text: 'text-primary',      chip: 'bg-primary/15 text-primary',        glow: 'hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_12px_40px_-8px_hsl(var(--primary)/0.35)]', ring: 'group-hover:border-primary/40' },
  emerald: { text: 'text-emerald-400',  chip: 'bg-emerald-500/15 text-emerald-400', glow: 'hover:shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_12px_40px_-8px_rgba(16,185,129,0.35)]', ring: 'group-hover:border-emerald-500/40' },
  sky:     { text: 'text-sky-400',      chip: 'bg-sky-500/15 text-sky-400',         glow: 'hover:shadow-[0_0_0_1px_rgba(56,189,248,0.4),0_12px_40px_-8px_rgba(56,189,248,0.35)]', ring: 'group-hover:border-sky-500/40' },
  amber:   { text: 'text-amber-400',    chip: 'bg-amber-500/15 text-amber-400',     glow: 'hover:shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_12px_40px_-8px_rgba(251,191,36,0.35)]', ring: 'group-hover:border-amber-500/40' },
  fuchsia: { text: 'text-fuchsia-400',  chip: 'bg-fuchsia-500/15 text-fuchsia-400', glow: 'hover:shadow-[0_0_0_1px_rgba(232,121,249,0.4),0_12px_40px_-8px_rgba(232,121,249,0.35)]', ring: 'group-hover:border-fuchsia-500/40' },
  rose:    { text: 'text-rose-400',     chip: 'bg-rose-500/15 text-rose-400',       glow: 'hover:shadow-[0_0_0_1px_rgba(251,113,133,0.4),0_12px_40px_-8px_rgba(251,113,133,0.35)]', ring: 'group-hover:border-rose-500/40' },
};

// Frosted glass panel — the base surface for every admin card/section.
export const GlassPanel = ({ className = '', children, as: As = 'div', ...props }) => (
  <As
    className={`rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] ${className}`}
    {...props}
  >
    {children}
  </As>
);

// Big section header with optional sub-copy (explanatory) + right-aligned slot.
export const SectionTitle = ({ children, sub, right, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 ${className}`}>
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{children}</h2>
      {sub && <p className="text-sm text-white/50 mt-1.5 max-w-xl">{sub}</p>}
    </div>
    {right && <div className="flex-shrink-0">{right}</div>}
  </div>
);

// Big interactive statistic tile: huge number, label, helper text, icon chip,
// optional trend badge. Hover-lifts and glows; click-through when onClick given.
export const StatTile = ({
  label, value, sub, icon: Icon, accent = 'primary',
  onClick, loading = false, trend, index = 0,
}) => {
  const a = ACCENTS[accent] || ACCENTS.primary;
  const clickable = typeof onClick === 'function';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      className={`group text-left w-full rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl p-5
        shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] transition-all duration-200
        ${clickable ? `cursor-pointer hover:-translate-y-0.5 ${a.glow}` : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.chip} border border-white/10`}>
          {Icon && <Icon className="w-5 h-5" />}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-4xl sm:text-5xl font-black tracking-tight text-white tabular-nums">
          {loading ? <Loader2 className="w-7 h-7 animate-spin text-white/40" /> : value}
        </span>
        {trend != null && !loading && (
          <span className={`text-xs font-semibold ${a.text}`}>{trend}</span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        {sub && <p className="text-xs text-white/45">{sub}</p>}
        {clickable && <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition-colors" />}
      </div>
    </motion.button>
  );
};

// A compact "pill" metric for dense rows (e.g. live snapshot).
export const MetricPill = ({ label, value, accent = 'primary' }) => {
  const a = ACCENTS[accent] || ACCENTS.primary;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <span className={`text-lg font-bold tabular-nums ${a.text}`}>{value}</span>
      <span className="text-xs text-white/50">{label}</span>
    </div>
  );
};

export const glassClasses = 'rounded-2xl border border-white/10 bg-white/[0.045] backdrop-blur-xl';
