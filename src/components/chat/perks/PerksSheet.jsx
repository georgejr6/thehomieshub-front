import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Gift, Megaphone, Coins, Loader2, Check, CreditCard, ChevronLeft, Search, Sparkles, ShieldCheck, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roleColor } from '../ChatMarkdown';

// Homies Points sheet: Gift (membership for someone / yourself), Shoutout,
// and Points (balance, how to earn, buy packs). Bottom sheet on phones,
// centred panel on desktop.
//
// Short on points? The gift/shoutout button becomes "Get N more points":
// pick a pack → one-tap confirm on your saved card (or Stripe Checkout the
// first time, which saves it) → the gift/shoutout you were making goes
// through right after, so it's one flow, not three screens.

const PENDING_KEY = 'hh_pending_perk';
const fmt = (n) => (n || 0).toLocaleString();
const usd = (cents) => `$${(cents / 100).toFixed(2)}`;
const pinLabel = (m) => (m >= 60 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${m} min`);
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const apiError = (err) => err?.response?.data?.error || {};
const apiMessage = (err, fallback) => err?.response?.data?.message || fallback;

export const savePendingPerk = (p) => { try { sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ...p, at: Date.now() })); } catch { /* private mode */ } };
export const takePendingPerk = () => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    const p = raw && JSON.parse(raw);
    return p && Date.now() - p.at < 30 * 60 * 1000 ? p : null;
  } catch { return null; }
};

function Avatar({ u, size = 32 }) {
  if (u?.avatarUrl) return <img src={u.avatarUrl} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  return <span className="flex shrink-0 items-center justify-center rounded-full bg-[#5865F2] font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>{(u?.displayName || u?.username || '?').slice(0, 1).toUpperCase()}</span>;
}

// ── Gift ─────────────────────────────────────────────────────────────────
function GiftTab({ catalog, form, setForm, actions, me }) {
  const [query, setQuery] = useState(form.query || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (form.self || form.to) return undefined;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      const list = await actions.searchMembers(query).catch(() => []);
      setResults(list.filter((u) => u.id !== me?.id && !u.bot).slice(0, 6));
      setSearching(false);
    }, 180);
    return () => clearTimeout(debounce.current);
  }, [query, form.self, form.to]); // eslint-disable-line

  const base = catalog.plans[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#1E1F22] p-1 text-sm font-semibold">
        {[['Someone', false], ['Myself', true]].map(([label, self]) => (
          <button key={label} type="button" onClick={() => setForm({ ...form, self, to: self ? null : form.to })}
            className={cn('rounded-md py-2 transition-colors', form.self === self ? 'bg-[#404249] text-white' : 'text-[#B5BAC1] hover:text-white')}>
            {label}
          </button>
        ))}
      </div>

      {!form.self && (
        form.to ? (
          <div className="chat-pop flex items-center gap-3 rounded-lg bg-[#2B2D31] p-2.5">
            <Avatar u={form.to} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold" style={{ color: form.to.color ? roleColor(form.to.color) : '#F2F3F5' }}>{form.to.displayName}</div>
              <div className="truncate text-xs text-[#949BA4]">@{form.to.username}</div>
            </div>
            <button type="button" onClick={() => setForm({ ...form, to: null })} className="rounded px-2 py-1 text-xs text-[#B5BAC1] hover:bg-[#404249] hover:text-white">Change</button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 rounded-lg bg-[#1E1F22] px-3">
              <Search className="h-4 w-4 text-[#949BA4]" />
              <input autoFocus value={query} onChange={(e) => setQuery(e.target.value.replace(/^@/, ''))} placeholder="Search members" className="w-full bg-transparent py-2.5 text-[15px] text-white outline-none placeholder:text-[#6D6F78]" />
              {searching && <Loader2 className="h-4 w-4 animate-spin text-[#949BA4]" />}
            </div>
            <div className="mt-1 max-h-48 overflow-y-auto">
              {results.map((u) => (
                <button key={u.id} type="button" onClick={() => setForm({ ...form, to: u })} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-[#35373C]">
                  <Avatar u={u} />
                  <span className="truncate font-medium" style={{ color: u.color ? roleColor(u.color) : '#F2F3F5' }}>{u.displayName}</span>
                  <span className="truncate text-sm text-[#949BA4]">{u.username}</span>
                </button>
              ))}
              {!searching && query && !results.length && <div className="px-2 py-3 text-sm text-[#949BA4]">No members match “{query}”.</div>}
            </div>
          </div>
        )
      )}

      <div className="grid gap-2">
        {catalog.plans.map((p) => {
          const save = Math.round((1 - p.points / ((p.days / base.days) * base.points)) * 100);
          const active = form.plan === p.id;
          return (
            <button key={p.id} type="button" onClick={() => setForm({ ...form, plan: p.id })}
              className={cn('flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all active:scale-[0.99]', active ? 'border-[#F0B94D] bg-[#F0B94D]/10' : 'border-transparent bg-[#2B2D31] hover:bg-[#35373C]')}>
              <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', active ? 'border-[#F0B94D] bg-[#F0B94D]' : 'border-[#4E5058]')}>{active && <Check className="h-3 w-3 text-black" />}</span>
              <span className="flex-1">
                <span className="block font-semibold text-white">{p.label}</span>
                {save > 0 && <span className="text-xs font-semibold text-[#23A55A]">Save {save}%</span>}
              </span>
              <span className="font-bold text-[#F0B94D]">{fmt(p.points)} pts</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[#949BA4]">{form.self ? 'Adds membership time to your account.' : 'They get full Homies access. If they already have time, the gift starts when it ends — nothing is wasted.'} Everyone in the channel sees it.</p>
    </div>
  );
}

// ── Shoutout ─────────────────────────────────────────────────────────────
function ShoutoutTab({ catalog, form, setForm, me }) {
  const tiers = catalog.shoutout.tiers;
  const tier = [...tiers].reverse().find((t) => form.points >= t.min) || tiers[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tiers.map((t) => (
          <button key={t.min} type="button" onClick={() => setForm({ ...form, points: t.min })}
            className={cn('rounded-full px-3 py-1.5 text-sm font-bold text-white transition-transform active:scale-95', form.points === t.min ? 'ring-2 ring-white ring-offset-2 ring-offset-[#313338]' : 'opacity-80 hover:opacity-100')}
            style={{ background: t.color }}>
            {fmt(t.min)}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-[#B5BAC1]">
        Custom
        <input type="number" inputMode="numeric" min={catalog.shoutout.min} max={catalog.shoutout.max} value={form.points}
          onChange={(e) => setForm({ ...form, points: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          className="w-28 rounded-md bg-[#1E1F22] px-2.5 py-1.5 text-white outline-none focus:ring-2 focus:ring-[#5865F2]" />
        pts
      </label>
      <div>
        <textarea value={form.message} maxLength={300} rows={3} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Say something to the whole channel…"
          className="w-full resize-none rounded-lg bg-[#1E1F22] px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-[#6D6F78] focus:ring-2 focus:ring-[#5865F2]" />
        <div className="text-right text-xs text-[#949BA4]">{form.message.length}/300</div>
      </div>
      {/* Live preview */}
      <div className="overflow-hidden rounded-xl border transition-colors" style={{ borderColor: `${tier.color}66`, background: `${tier.color}1f` }}>
        <div className="flex items-center gap-2 px-3 py-1.5 transition-colors" style={{ background: tier.color }}>
          <Megaphone className="h-4 w-4 text-white" />
          <span className="truncate text-sm font-bold text-white">{me?.displayName || 'You'}</span>
          <span className="ml-auto rounded-full bg-black/25 px-2 py-0.5 text-xs font-bold text-white">{fmt(form.points)} pts</span>
        </div>
        <div className="min-h-[2.5rem] px-3 py-2 text-[15px] text-white">{form.message || <span className="text-white/40">Your message</span>}</div>
      </div>
      <p className="text-xs text-[#949BA4]">Pinned to the top of the channel for <b className="text-white">{pinLabel(tier.pinMinutes)}</b>. Bigger shoutouts get a louder colour and stay pinned longer.</p>
    </div>
  );
}

// ── Points / buy ─────────────────────────────────────────────────────────
function PointsTab({ balance, need, actions, onBought, onCheckout, busy, setBusy, setError }) {
  const [packs, setPacks] = useState(null);
  const [card, setCard] = useState(undefined);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(null);
  const requestId = useRef(uuid());

  useEffect(() => {
    actions.points.packs().then(setPacks).catch(() => setPacks([]));
    actions.points.card().then(setCard).catch(() => setCard(null));
  }, [actions]);

  const suggested = useMemo(() => (need > 0 && packs ? packs.find((p) => p.credits >= need) || packs[packs.length - 1] : null), [need, packs]);
  const perDollar = (p) => p.credits / (p.amountCents / 100);
  const baseRate = packs?.length ? perDollar(packs[0]) : 100;

  const buy = async () => {
    setBusy(true); setError('');
    try {
      const r = await actions.points.buy({ pack: picked.id, requestId: requestId.current, returnPath: window.location.pathname });
      if (r.status === 'succeeded') {
        requestId.current = uuid();
        setDone(picked);
        setPicked(null);
        setTimeout(() => { setDone(null); onBought(r); }, 1100);
      } else if (r.status === 'checkout') {
        onCheckout(r.url, r.reason);
      }
    } catch (err) {
      setError(apiMessage(err, "Couldn't complete the purchase."));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="chat-pop flex flex-col items-center py-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#23A55A] text-white"><Check className="h-9 w-9" /></div>
        <div className="mt-3 text-lg font-bold text-white">+{fmt(done.credits)} points</div>
        <div className="text-sm text-[#B5BAC1]">Receipt sent to your email.</div>
      </div>
    );
  }

  if (picked) {
    return (
      <div className="chat-fade-in space-y-4">
        <button type="button" onClick={() => setPicked(null)} className="flex items-center gap-1 text-sm text-[#B5BAC1] hover:text-white"><ChevronLeft className="h-4 w-4" /> Packs</button>
        <div className="rounded-xl bg-[#2B2D31] p-4 text-center">
          <div className="text-sm text-[#B5BAC1]">You're buying</div>
          <div className="mt-1 text-3xl font-extrabold text-[#F0B94D]">{fmt(picked.credits)} pts</div>
          <div className="mt-1 text-lg font-semibold text-white">{usd(picked.amountCents)}</div>
        </div>
        {card ? (
          <div className="flex items-center gap-3 rounded-lg bg-[#1E1F22] px-3 py-2.5 text-sm text-[#DBDEE1]">
            <CreditCard className="h-5 w-5 text-[#B5BAC1]" />
            <span className="flex-1 capitalize">{card.brand} •••• {card.last4}</span>
            <span className="text-xs text-[#949BA4]">exp {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}</span>
          </div>
        ) : (
          <p className="text-sm text-[#B5BAC1]">You'll add a card on Stripe's secure page. It's saved, so next time is one tap.</p>
        )}
        <p className="flex items-center justify-center gap-1.5 text-xs text-[#949BA4]"><ShieldCheck className="h-3.5 w-3.5" /> Charged by Stripe. Points never expire and can't be cashed out.</p>
        <button type="button" disabled={busy} onClick={buy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#23A55A] py-3 font-bold text-white transition-colors hover:bg-[#1A8D48] disabled:opacity-60">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {card ? `Pay ${usd(picked.amountCents)}` : 'Continue to secure checkout'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-[#3a2e12] to-[#1f1b12] p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#C9B27A]">Your balance</div>
        <div className="mt-1 flex items-baseline gap-2"><span className="text-3xl font-extrabold text-[#F0B94D]">{balance == null ? '—' : fmt(balance)}</span><span className="text-[#C9B27A]">pts</span></div>
        {need > 0 && <div className="mt-1 text-sm text-white">You need <b>{fmt(need)}</b> more for that.</div>}
        <div className="mt-2 text-xs leading-relaxed text-[#C9B27A]">Earn free points by chatting (+1, up to 10 a day) and when others react to your messages (+2, up to 20 a day).</div>
      </div>
      {!packs ? (
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[#949BA4]" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {packs.map((p) => {
            const bonus = Math.round((perDollar(p) / baseRate - 1) * 100);
            const isSuggested = suggested?.id === p.id;
            return (
              <button key={p.id} type="button" onClick={() => { setError(''); setPicked(p); }}
                className={cn('relative rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98]', isSuggested ? 'border-[#F0B94D] bg-[#F0B94D]/10' : 'border-transparent bg-[#2B2D31] hover:bg-[#35373C]')}>
                {isSuggested && <span className="absolute -top-2 right-2 rounded-full bg-[#F0B94D] px-2 text-[10px] font-bold uppercase text-black">Covers it</span>}
                <div className="flex items-center gap-1 text-lg font-extrabold text-white"><Coins className="h-4 w-4 text-[#F0B94D]" />{fmt(p.credits)}</div>
                <div className="text-sm text-[#B5BAC1]">{usd(p.amountCents)}</div>
                {bonus > 0 && <div className="mt-0.5 text-xs font-bold text-[#23A55A]">+{bonus}% bonus</div>}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        {card ? (
          <span className="flex items-center gap-2 text-[#B5BAC1]">
            <CreditCard className="h-4 w-4" /><span className="capitalize">{card.brand}</span> •••• {card.last4}
            <button type="button" onClick={async () => { await actions.points.removeCard().catch(() => {}); setCard(null); }} className="text-xs text-[#F23F43] hover:underline">Remove</button>
          </span>
        ) : <span className="text-xs text-[#949BA4]">{card === null ? 'No card saved yet.' : ''}</span>}
        <Link to="/wallet/transactions" className="flex items-center gap-1 text-[#00A8FC] hover:underline"><Receipt className="h-4 w-4" />History</Link>
      </div>
    </div>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'gift', label: 'Gift', icon: Gift },
  { id: 'shoutout', label: 'Shoutout', icon: Megaphone },
  { id: 'points', label: 'Points', icon: Coins },
];

export default function PerksSheet({ open, initial, onClose, state, actions, channel, onToast }) {
  const [tab, setTab] = useState('gift');
  const [catalog, setCatalog] = useState(null);
  const [gift, setGift] = useState({ self: false, to: null, plan: 'homies_1m', query: '' });
  const [shout, setShout] = useState({ points: 500, message: '' });
  const [need, setNeed] = useState(0);
  const [resume, setResume] = useState(null); // 'gift' | 'shoutout' — finish after buying points
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const balance = state.wallet?.balance;

  useEffect(() => {
    if (!open) return;
    setError(''); setSuccess(null); setBusy(false);
    setTab(initial?.tab || 'gift');
    if (initial?.gift) setGift((g) => ({ ...g, ...initial.gift }));
    if (initial?.shoutout) setShout((s) => ({ ...s, ...initial.shoutout }));
    setResume(initial?.resume || null);
    setNeed(initial?.need || 0);
    if (!catalog) actions.perksCatalog().then(setCatalog).catch(() => setError("Couldn't load. Try again."));
    actions.loadWallet().catch(() => {});
  }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const plan = catalog?.plans.find((p) => p.id === gift.plan);
  const cost = tab === 'gift' ? plan?.points || 0 : tab === 'shoutout' ? shout.points : 0;
  const short = balance != null && cost > balance ? cost - balance : 0;

  const run = useCallback(async (which) => {
    setBusy(true); setError('');
    try {
      if (which === 'gift') {
        const r = await actions.gift(channel.id, { toUserId: gift.self ? undefined : gift.to?.id, plan: gift.plan });
        setSuccess({ kind: gift.self ? 'redeem' : 'gift', text: gift.self ? `${plan?.label} is yours.` : `You gifted ${gift.to?.displayName} ${plan?.label}!`, sub: r.deferred ? `Starts ${new Date(r.startsAt).toLocaleDateString()}, after the time they already have.` : 'The whole channel saw it.' });
      } else {
        await actions.shoutout(channel.id, { points: shout.points, message: shout.message });
        setSuccess({ kind: 'shoutout', text: 'Shoutout is live!', sub: 'Pinned at the top of the channel.' });
        setShout((s) => ({ ...s, message: '' }));
      }
      setResume(null); setNeed(0);
      setTimeout(onClose, 1500);
    } catch (err) {
      const e = apiError(err);
      if (e.code === 'insufficient_points') {
        setNeed(e.needed); setResume(which); setTab('points');
      } else setError(apiMessage(err, 'Something went wrong.'));
    } finally {
      setBusy(false);
    }
  }, [actions, channel, gift, shout, plan, onClose]);

  const goBuy = () => { setNeed(short); setResume(tab); setTab('points'); };

  const onBought = (r) => {
    onToast?.(`+${fmt(r.credits)} points added.`);
    if (resume) {
      const which = resume;
      setTab(which);
      setTimeout(() => run(which), 50); // finish what they were doing
    }
  };

  const onCheckout = (url, reason) => {
    savePendingPerk({ tab: resume || tab, resume, channelId: channel.id, gift: { ...gift, query: '' }, shoutout: shout, need });
    if (reason) {
      setError(reason);
      setTimeout(() => { window.location.href = url; }, 1800);
    } else window.location.href = url;
  };

  if (!open) return null;
  const canGo = tab === 'gift' ? !!plan && (gift.self || !!gift.to) : tab === 'shoutout' ? shout.points >= (catalog?.shoutout.min || 100) : false;
  const actionLabel = tab === 'gift'
    ? (gift.self ? `Redeem · ${fmt(plan?.points)} pts` : `Gift${gift.to ? ` ${gift.to.displayName}` : ''} · ${fmt(plan?.points)} pts`)
    : `Send shoutout · ${fmt(shout.points)} pts`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Homies Points">
      <div className="chat-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="chat-sheet-up relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#313338] shadow-2xl sm:max-w-md sm:rounded-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#4E5058] sm:hidden" />
        <div className="flex items-center gap-2 px-4 pb-2 pt-3">
          <div className="flex flex-1 gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => { setTab(id); setError(''); }}
                className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors', tab === id ? 'bg-[#F0B94D] text-black' : 'text-[#B5BAC1] hover:bg-[#404249] hover:text-white')}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
          {success ? (
            <div className="chat-pop flex flex-col items-center py-10 text-center">
              <div className="chat-gift-bounce text-6xl">{success.kind === 'shoutout' ? '📣' : success.kind === 'redeem' ? '✨' : '🎁'}</div>
              <div className="mt-4 text-xl font-bold text-white">{success.text}</div>
              <div className="mt-1 text-sm text-[#B5BAC1]">{success.sub}</div>
            </div>
          ) : !catalog ? (
            <div className="flex justify-center py-10">{error ? <span className="text-sm text-[#F23F43]">{error}</span> : <Loader2 className="h-6 w-6 animate-spin text-[#949BA4]" />}</div>
          ) : tab === 'gift' ? (
            <GiftTab catalog={catalog} form={gift} setForm={setGift} actions={actions} me={state.me} />
          ) : tab === 'shoutout' ? (
            <ShoutoutTab catalog={catalog} form={shout} setForm={setShout} me={state.me} />
          ) : (
            <PointsTab balance={balance} need={need} actions={actions} onBought={onBought} onCheckout={onCheckout} busy={busy} setBusy={setBusy} setError={setError} />
          )}
          {error && catalog && !success && <div className="chat-fade-in mt-3 rounded-lg bg-[#F23F43]/15 px-3 py-2 text-sm text-[#F23F43]">{error}</div>}
        </div>

        {catalog && !success && tab !== 'points' && (
          <div className="border-t border-[#1F2023] p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-[#949BA4]">
              <span>You have <b className="text-[#F0B94D]">{balance == null ? '—' : fmt(balance)} pts</b></span>
              {tab === 'gift' && gift.self && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Redeem for yourself</span>}
            </div>
            {short > 0 ? (
              <button type="button" onClick={goBuy} className="w-full rounded-lg bg-[#5865F2] py-3 font-bold text-white transition-colors hover:bg-[#4752C4]">
                Get {fmt(short)} more points
              </button>
            ) : (
              <button type="button" disabled={!canGo || busy} onClick={() => run(tab)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F0B94D] py-3 font-bold text-black transition-colors hover:bg-[#E5A93A] disabled:opacity-50">
                {busy && <Loader2 className="h-5 w-5 animate-spin" />}{actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
