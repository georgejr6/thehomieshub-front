import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import GarmentSilhouette from '@/shop/components/GarmentSilhouette';

// Small shop-only UI kit (the shop has its own look; it doesn't reuse the
// app's shadcn theme so nothing outside the shop changes).

export function ShopButton({ as: Comp = 'button', variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props }) {
  const base = 'shop-block inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 select-none disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98]';
  const variants = {
    primary: 'bg-white text-black hover:bg-[#f0b94d]',
    gold: 'bg-[#f0b94d] text-black hover:brightness-110',
    ghost: 'bg-white/[0.06] text-white hover:bg-white/[0.12] border border-white/10',
    outline: 'border border-white/25 text-white hover:border-white hover:bg-white/5',
    danger: 'bg-[#e04848] text-white hover:brightness-110',
    link: 'text-white/70 hover:text-white underline-offset-4 hover:underline rounded-none',
  };
  const sizes = { sm: 'h-9 px-4 text-xs', md: 'h-11 px-6 text-sm', lg: 'h-14 px-8 text-base', icon: 'h-10 w-10' };
  return (
    <Comp className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </Comp>
  );
}

export const Skeleton = ({ className }) => <div className={cn('shop-skel rounded-2xl', className)} aria-hidden />;

export function Eyebrow({ children, className }) {
  return <p className={cn('text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50', className)}>{children}</p>;
}

/** Inline helper tip (the "helpers" the owner asked for). */
export function Tip({ children, className, tone = 'default' }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-relaxed',
      tone === 'warn' ? 'bg-[#f0b94d]/10 text-[#f6d48f]' : tone === 'bad' ? 'bg-[#e04848]/10 text-[#f3a0a0]' : 'bg-white/[0.04] text-white/70', className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Swatch({ hex, selected, label, onClick, disabled, size = 'md' }) {
  const s = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      className={cn('shop-block relative rounded-full transition-transform duration-150 hover:scale-105 disabled:opacity-30', s,
        selected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0b]' : 'ring-1 ring-white/15')}
      style={{ background: hex }}
    />
  );
}

export function Pill({ selected, children, className, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn('shop-block h-10 min-w-[3rem] rounded-full border px-4 text-sm font-semibold transition-colors',
        selected ? 'border-white bg-white text-black' : 'border-white/15 text-white/85 hover:border-white/50', 'disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through', className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function Toast({ toast }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className={cn('pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-2xl',
              toast.tone === 'error' ? 'bg-[#e04848] text-white' : 'bg-white text-black')}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Lazy image with a skeleton until it loads and a graceful fallback. */
/** fallback: { kind, hex, phrase } → garment silhouette placeholder instead of a broken image. */
export function ShopImage({ src, alt, className, imgClassName, fit = 'cover', fallback, ...props }) {
  const [state, setState] = React.useState('loading');
  const ref = React.useRef(null);
  // A cached image can fire onLoad before this effect runs — check `complete`
  // so it doesn't get stuck invisible.
  React.useEffect(() => {
    if (!src) { setState('error'); return; }
    const el = ref.current;
    setState(el?.complete && el.naturalWidth > 0 ? 'ok' : 'loading');
  }, [src]);
  return (
    <div className={cn('relative overflow-hidden bg-[#141416]', className)}>
      {state === 'loading' && <div className="shop-skel absolute inset-0" aria-hidden />}
      {state === 'error' ? (
        fallback ? <GarmentSilhouette className="absolute inset-0" kind={fallback.kind} hex={fallback.hex} phrase={fallback.phrase} />
          : <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-widest text-white/30">The Homies</div>
      ) : (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={cn('h-full w-full transition-opacity duration-500', fit === 'contain' ? 'object-contain' : 'object-cover', state === 'ok' ? 'opacity-100' : 'opacity-0', imgClassName)}
          {...props}
        />
      )}
    </div>
  );
}

export const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
