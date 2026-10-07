import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { fetchProduct } from '@/lib/merch';
import AddonsPanel, { toCartAddons, fromCartAddons } from '@/shop/components/AddonsPanel';
import { kindOf, colorHex, isLightColor, threadPaletteFor } from '@/shop/lib/catalog';
import { ArrowLeft, ArrowRight, Check, Lock, ShieldCheck, Sparkles, Eye, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { markCartCheckout, clearCartCheckoutMarker } from '@/lib/merch';
import { useShop } from '@/shop/ShopContext';
import { ShopButton, Tip, ShopImage, useFocusTrap } from '@/shop/components/ui';
import CartLine from '@/shop/components/CartLine';
import { subtotalCents, lineTotalCents, usd } from '@/shop/lib/pricing';
import { needsApproval, checkoutItems, pruneUnavailable, cartCount, MAX_ORDER_ITEMS } from '@/shop/lib/cart';
import { startCheckout, apiError, fetchOffers } from '@/shop/lib/api';
import DesignPreviewDialog from '@/shop/components/DesignPreviewDialog';
import CompleteTheLook from '@/shop/components/CompleteTheLook';

const STEPS = [{ key: 'cart', label: 'Bag' }, { key: 'review', label: 'Review' }, { key: 'pay', label: 'Pay' }];

export default function ShopCart() {
  const { cart, notify, reload, signedIn } = useShop();
  const [params, setParams] = useSearchParams();
  const step = params.get('step') === 'review' && cart.cart.length ? 'review' : 'cart';
  const [agree, setAgree] = useState(false);
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(null); // cart line whose add-ons are being edited
  const [previewing, setPreviewing] = useState(null); // custom line shown big ("Your design")
  const [offer, setOffer] = useState(null); // { discountCents, bundleMinItems, pointsMaxPct, pointsMin, centsPerPoint, points }
  const [usePoints, setUsePoints] = useState(false);
  const [pointsWanted, setPointsWanted] = useState(null); // null = as many as allowed
  useEffect(() => { fetchOffers().then(setOffer).catch(() => setOffer(null)); }, [signedIn]);
  // A marker left by an earlier, abandoned checkout must not empty the bag later.
  useEffect(() => { clearCartCheckoutMarker(); }, []);
  // The final-sale confirmation is for exactly this bag: any change resets it.
  const bagSig = cart.cart.map((l) => `${l.key}x${l.quantity}`).join('|');
  useEffect(() => { setAgree(false); }, [bagSig]);
  const custom = needsApproval(cart.cart);
  const subtotal = subtotalCents(cart.cart);
  // one discount per order, same rule as the server (utils/merch/checkout.js offerFor), which has the final say:
  // $5 bundle with 2+ items, or Homies Points (1 pt = 1¢, up to 20% of the items), whichever is worth more
  const bundleOk = !!offer?.discountCents && cart.count >= offer.bundleMinItems;
  const bundleCents = bundleOk ? offer.discountCents : 0;
  const cpp = offer?.centsPerPoint || 1;
  const pointsMin = offer?.pointsMin || 100;
  const pointsCap = offer?.pointsMaxPct ? Math.floor(Math.floor((subtotal * offer.pointsMaxPct) / 100) / cpp) : 0;
  const pointsMax = Math.min(pointsCap, offer?.points || 0); // most this buyer can use on this bag
  const canUsePoints = offer?.points != null && pointsMax >= pointsMin;
  const pointsUsed = canUsePoints && usePoints ? Math.max(pointsMin, Math.min(pointsWanted ?? pointsMax, pointsMax)) : 0;
  const pointsWin = pointsUsed * cpp > bundleCents;
  const bundle = bundleOk && !pointsWin;
  const discount = pointsWin ? pointsUsed * cpp : bundleCents;
  const go = (s) => { setParams(s === 'cart' ? {} : { step: s }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const pay = async () => {
    if (custom && !agree) { notify('Please confirm the custom-item note first.', 'error'); return; }
    if (cartCount(cart.cart) > MAX_ORDER_ITEMS) { notify(`Up to ${MAX_ORDER_ITEMS} items per order — lower a quantity or save something for later.`, 'error'); return; }
    setPaying(true);
    markCartCheckout();
    try {
      await startCheckout(checkoutItems(cart.cart), { points: pointsWin ? pointsUsed : 0 });
    } catch (e) {
      clearCartCheckoutMarker();
      setPaying(false);
      const code = e?.response?.data?.code;
      if (code === 'printfiles_missing' || code === 'design_not_ready') { notify('One of your designs needs a refresh. Open it from Your library and add it to your bag again.', 'error'); return; }
      if (code === 'design_not_found') { notify("One of your designs can't be found anymore. Remove it from your bag and try again.", 'error'); return; }
      if (code === 'unavailable' || code === 'addons_unavailable') {
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
    <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-6 sm:px-6 lg:px-10">
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
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {step === 'cart' ? (
                <motion.div key="cart" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                  <h1 className="font-display text-5xl sm:text-6xl">Your bag</h1>
                  <ul className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                    {cart.cart.map((l) => <li key={l.key} className="py-6"><CartLine line={l} onEdit={(line) => setEditing(line)} onPreview={setPreviewing} /></li>)}
                  </ul>
                  <CompleteTheLook offer={offer} className="mt-10" />
                  <SavedForLater />
                </motion.div>
              ) : (
                <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <button type="button" onClick={() => go('cart')} className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" /> Edit bag</button>
                  <h1 className="font-display mt-4 text-5xl sm:text-6xl">Review your order</h1>
                  <p className="mt-2 text-sm text-white/55">Check everything looks right. You'll enter shipping and payment on the next screen (secured by Stripe).</p>
                  <ul className="mt-6 space-y-3">
                    {cart.cart.map((l) => (
                      <li key={l.key} className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#111113] p-3">
                        {l.kind === 'custom' ? (
                          <button type="button" onClick={() => setPreviewing(l)} aria-label={`Preview your design: ${l.name}`} className="shrink-0 overflow-hidden rounded-xl">
                            <ShopImage src={l.image} alt="" className="h-20 w-16" />
                          </button>
                        ) : <ShopImage src={l.image} alt="" className="h-20 w-16 shrink-0 rounded-xl" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{l.name}</p>
                          <p className="text-xs text-white/50">{l.variant} · Qty {l.quantity}</p>
                          {l.addons?.length > 0 && <p className="mt-1 truncate text-xs text-[#f0b94d]">+ {l.addons.map((a) => (a.text ? `${a.label} “${a.text}”` : a.label)).join(', ')}</p>}
                          {l.kind === 'custom' && (
                            <button type="button" onClick={() => setPreviewing(l)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#f0b94d] underline-offset-4 hover:underline">
                              <Eye className="h-3.5 w-3.5" /> Your design · Preview
                            </button>
                          )}
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
                  <CompleteTheLook offer={offer} className="mt-10" />
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
                {discount > 0 && (
                  <div className="flex justify-between text-[#7be0a5]"><dt>{bundle ? `Bundle discount (${offer.bundleMinItems}+ items)` : `Homies Points (${pointsUsed.toLocaleString('en-US')} pts)`}</dt><dd>−{usd(discount)}</dd></div>
                )}
                {discount > 0 && (
                  <p className="text-[11px] text-white/40">Applied on the payment screen.</p>
                )}
                <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold"><dt>Subtotal</dt><dd>{usd(subtotal - discount)}</dd></div>
              </dl>
              <PointsCard offer={offer} signedIn={signedIn} canUse={canUsePoints} on={usePoints} setOn={setUsePoints}
                used={pointsUsed} min={pointsMin} max={pointsMax} cpp={cpp} onChange={setPointsWanted}
                bundleCents={bundleCents} pointsWin={pointsWin} />
              {!bundleOk && !!offer?.discountCents && cart.count < offer.bundleMinItems && (
                <p className="mt-4 text-xs text-white/55">Add {offer.bundleMinItems - cart.count === 1 ? 'one more item' : `${offer.bundleMinItems - cart.count} more items`} and get {usd(offer.discountCents)} off{canUsePoints ? ', and keep your points' : ''}.</p>
              )}
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
      <AddonEditDialog line={editing} onClose={() => setEditing(null)} />
      <DesignPreviewDialog line={previewing} onClose={() => setPreviewing(null)} />
    </div>
  );
}

/**
 * Pay part of the items with Homies Points: 1 pt = 1¢, up to 20% of the items.
 * Signed out: a sign-in nudge. Points never stack with the bundle; the bigger one wins.
 */
function PointsCard({ offer, signedIn, canUse, on, setOn, used, min, max, cpp, onChange, bundleCents, pointsWin }) {
  if (!offer?.pointsMaxPct) return null;
  const pct = offer.pointsMaxPct;
  const n = (v) => v.toLocaleString('en-US');
  if (!signedIn || offer.points == null) {
    return (
      <Link to="/?openAuth=1&tab=signin&redirect=/shop/cart" className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm transition-colors hover:border-[#f0b94d]/40">
        <Coins className="h-5 w-5 shrink-0 text-[#f0b94d]" />
        <span><span className="font-semibold text-white">Got Homies Points?</span>
          <span className="block text-xs text-white/55">Sign in to take up to {pct}% off with your points.</span></span>
      </Link>
    );
  }
  if (!canUse) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
        <Coins className="h-4 w-4 shrink-0 text-[#f0b94d]" />
        You have {n(offer.points)} points. With {n(min)}+ you can take up to {pct}% off.
      </p>
    );
  }
  return (
    <div className={cn('mt-4 rounded-2xl border p-3 text-sm transition-colors', on ? 'border-[#f0b94d]/40 bg-[#f0b94d]/[0.07]' : 'border-white/10 bg-white/[0.03]')}>
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#f0b94d]" />
        <span className="flex-1"><span className="inline-flex items-center gap-1 font-semibold text-[#f6d48f]"><Coins className="h-4 w-4" /> Pay with Homies Points</span>
          <span className="block text-xs text-white/55">You have {n(offer.points)}. Up to {pct}% off: {n(Math.round(100 / cpp))} pts = $1.</span></span>
      </label>
      <AnimatePresence initial={false}>
        {on && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold tabular-nums">{n(used)} pts</span>
                <span className="font-semibold tabular-nums text-[#7be0a5]">−{usd(used * cpp)}</span>
              </div>
              {max > min && (
                <input type="range" min={min} max={max} step={1} value={used} aria-label="Points to use"
                  onChange={(e) => onChange(Number(e.target.value))}
                  className="mt-2 w-full accent-[#f0b94d]" />
              )}
              <div className="mt-1 flex justify-between text-[11px] text-white/40">
                <span>{n(min)}</span>
                <button type="button" onClick={() => onChange(null)} className="font-semibold text-[#f0b94d] hover:underline">Max {n(max)}</button>
              </div>
              {bundleCents > 0 && !pointsWin && (
                <p className="mt-2 text-xs text-white/55">Your bundle saves {usd(bundleCents)}, which beats this. Slide past {n(Math.floor(bundleCents / cpp))} pts to use points instead, or keep them.</p>
              )}
              <p className="mt-2 text-[11px] text-white/40">If you don't finish paying, your points come back within about an hour.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Edit a line's add-ons in place (same product + variant; updates the existing line). */
function AddonEditDialog({ line, onClose }) {
  const { cart, notify, blanks } = useShop();
  const [product, setProduct] = useState(null);
  const [value, setValue] = useState({});
  const panel = useRef(null);
  useFocusTrap(!!line, panel);
  useEffect(() => {
    if (!line) return;
    setProduct(null); setValue(fromCartAddons(line.addons));
    fetchProduct(line.slug).then(setProduct).catch(() => setProduct(false));
  }, [line]);
  useEffect(() => {
    if (!line) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [line, onClose]);
  const variant = product?.variants?.find((v) => v.id === line?.variantId);
  const dark = variant ? !isLightColor(variant.color) : false;
  const type = product?.productType || (product ? kindOf(product) : '');
  const threads = threadPaletteFor(blanks, type);
  const save = () => {
    const { addons, error } = toCartAddons(product.addons || [], value, threads, dark);
    if (error) { notify(error, 'error'); return; }
    cart.updateAddons(line.key, addons);
    notify('Add-ons updated');
    onClose();
  };
  return (
    <AnimatePresence>
      {line && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-labelledby="edit-addons-title" onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 20 }}
            className="hh-shop max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0f0f11] p-6 sm:rounded-3xl">
            <p id="edit-addons-title" className="font-display text-2xl">Edit add-ons</p>
            <p className="mt-1 text-sm text-white/55">{line.name} · {line.variant}</p>
            <div className="mt-5">
              {product === null ? <div className="shop-skel h-40 rounded-2xl" />
                : product === false || !(product.addons || []).length ? <p className="text-sm text-white/55">Add-ons aren't available for this item right now.</p>
                : <AddonsPanel addons={product.addons} value={value} onChange={setValue} threadColors={threads} garmentHex={colorHex(variant?.color)} darkGarment={dark} />}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <ShopButton variant="ghost" size="sm" onClick={onClose}>Cancel</ShopButton>
              <ShopButton size="sm" disabled={!product} onClick={save}>Save</ShopButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
