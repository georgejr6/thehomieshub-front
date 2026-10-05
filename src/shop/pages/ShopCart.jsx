import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { markCartCheckout, clearCartCheckoutMarker } from '@/lib/merch';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Tip, ShopImage, pageMotion } from '@/shop/components/ui';
import CartLine from '@/shop/components/CartLine';
import { subtotalCents, lineTotalCents, usd } from '@/shop/lib/pricing';
import { needsApproval, checkoutItems, pruneUnavailable } from '@/shop/lib/cart';
import { startCheckout, apiError } from '@/shop/lib/api';

const STEPS = [{ key: 'cart', label: 'Bag' }, { key: 'review', label: 'Review' }, { key: 'pay', label: 'Pay' }];

export default function ShopCart() {
  const { cart, notify, reload } = useShop();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const step = params.get('step') === 'review' && cart.cart.length ? 'review' : 'cart';
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);
  const custom = needsApproval(cart.cart);
  const subtotal = subtotalCents(cart.cart);
  const go = (s) => { setParams(s === 'cart' ? {} : { step: s }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const pay = async () => {
    if (custom && !agree) { notify('Please confirm the custom-item note first.', 'error'); return; }
    setPaying(true);
    markCartCheckout();
    try {
      await startCheckout(checkoutItems(cart.cart));
    } catch (e) {
      clearCartCheckoutMarker();
      setPaying(false);
      if (e?.response?.data?.code === 'unavailable') {
        const products = await reload();
        const { kept, removed } = pruneUnavailable(cart.cart, products);
        if (removed.length) {
          cart.replace(kept);
          notify(`No longer available: ${removed.map((l) => `${l.name} (${l.variant})`).join(', ')}`, 'error');
          return;
        }
      }
      notify(apiError(e, 'Could not start checkout. Try again.'), 'error');
    }
  };

  return (
    <motion.div {...pageMotion} className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 sm:px-6 lg:px-10">
      <Helmet><title>Your bag | The Homies</title></Helmet>
      <Stepper current={step} />
      {cart.cart.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-display text-6xl">Your bag is empty</p>
          <p className="mt-3 text-white/55">Find a phrase you'd rep — or design one.</p>
          <ShopButton as={Link} to="/shop" size="lg" className="mt-8">Start shopping</ShopButton>
          {cart.saved.length > 0 && <SavedForLater />}
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div>
            <AnimatePresence mode="wait">
              {step === 'cart' ? (
                <motion.div key="cart" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <h1 className="font-display text-5xl sm:text-6xl">Your bag</h1>
                  <ul className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                    {cart.cart.map((l) => <li key={l.key} className="py-6"><CartLine line={l} onEdit={(line) => navigate(`/shop/${line.slug}`)} /></li>)}
                  </ul>
                  <SavedForLater />
                </motion.div>
              ) : (
                <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <button type="button" onClick={() => go('cart')} className="shop-block inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" /> Edit bag</button>
                  <h1 className="font-display mt-4 text-5xl sm:text-6xl">Review your order</h1>
                  <p className="mt-2 text-sm text-white/55">Check everything looks right. You'll enter shipping and payment on the next screen (secured by Stripe).</p>
                  <ul className="mt-6 space-y-3">
                    {cart.cart.map((l) => (
                      <li key={l.key} className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#111113] p-3">
                        <ShopImage src={l.image} alt="" className="h-20 w-16 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{l.name}</p>
                          <p className="text-xs text-white/50">{l.variant} · Qty {l.quantity}</p>
                          {l.addons?.length > 0 && <p className="mt-1 truncate text-xs text-[#f0b94d]">+ {l.addons.map((a) => (a.text ? `${a.label} “${a.text}”` : a.label)).join(', ')}</p>}
                          {l.kind === 'custom' && <p className="mt-1 text-xs text-[#f0b94d]">Your design</p>}
                        </div>
                        <p className="shrink-0 font-semibold">{usd(lineTotalCents(l))}</p>
                      </li>
                    ))}
                  </ul>
                  {custom && (
                    <div className="mt-6 rounded-2xl border border-[#f0b94d]/30 bg-[#f0b94d]/[0.06] p-5">
                      <p className="flex items-center gap-2 font-semibold text-[#f6d48f]"><Sparkles className="h-4 w-4" /> About customized pieces</p>
                      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-white/70">
                        <li>• Our team gives every custom piece a quick look before it goes to print — usually within a day.</li>
                        <li>• If something can't be printed (blurry image, content we can't print), we refund you in full.</li>
                        <li>• Custom pieces are made just for you, so they're final sale — unless they arrive misprinted or damaged, then we replace them.</li>
                      </ul>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
                        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#f0b94d]" />
                        <span>I understand custom pieces are final sale (misprints and damage are always covered).</span>
                      </label>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-white/10 bg-[#111113] p-6">
              <p className="font-display text-3xl">Summary</p>
              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between"><dt className="text-white/60">Items ({cart.count})</dt><dd>{usd(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-white/60">Shipping</dt><dd className="text-white/60">At checkout</dd></div>
                <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold"><dt>Subtotal</dt><dd>{usd(subtotal)}</dd></div>
              </dl>
              {step === 'cart' ? (
                <ShopButton size="lg" className="mt-6 w-full" onClick={() => go('review')}>Review order <ArrowRight className="h-4 w-4" /></ShopButton>
              ) : (
                <ShopButton size="lg" variant="gold" className="mt-6 w-full" loading={paying} disabled={custom && !agree} onClick={pay}>
                  <Lock className="h-4 w-4" /> Pay securely
                </ShopButton>
              )}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/40"><ShieldCheck className="h-3.5 w-3.5" /> Card details are handled by Stripe — we never see them.</p>
            </div>
            {step === 'review' && custom && !agree && <Tip className="mt-4">Tick the box above to continue.</Tip>}
          </aside>
        </div>
      )}
    </motion.div>
  );
}

function Stepper({ current }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mx-auto flex max-w-md items-center" aria-label="Checkout steps">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center last:flex-none" aria-current={i === idx ? 'step' : undefined}>
          <div className="flex items-center gap-2">
            <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
              i < idx ? 'bg-[#f0b94d] text-black' : i === idx ? 'bg-white text-black' : 'bg-white/10 text-white/50')}>
              {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn('text-xs font-semibold uppercase tracking-wider', i <= idx ? 'text-white' : 'text-white/40')}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <span className={cn('mx-3 h-px flex-1', i < idx ? 'bg-[#f0b94d]' : 'bg-white/10')} />}
        </li>
      ))}
    </ol>
  );
}

function SavedForLater() {
  const { cart } = useShop();
  if (!cart.saved.length) return null;
  return (
    <div className="mt-10 text-left">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">Saved for later</p>
      <ul className="space-y-5">{cart.saved.map((l) => <li key={l.key}><CartLine line={l} saved /></li>)}</ul>
    </div>
  );
}
