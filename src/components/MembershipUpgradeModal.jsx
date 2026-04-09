import React, { useState } from 'react';
import { Crown, CreditCard, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';

// Plans available on Stripe (card)
const STRIPE_PLANS = [
  { plan: 'homies', billingCycle: 'monthly', label: 'Homies Monthly',  price: '$15',  note: '/mo',   popular: true },
  { plan: 'homies', billingCycle: 'yearly',  label: 'Homies Yearly',   price: '$144', note: '/yr — $12/mo' },
  { plan: 'nomad',  billingCycle: 'monthly', label: 'Nomad Monthly',   price: '$100', note: '/mo' },
  { plan: 'nomad',  billingCycle: 'yearly',  label: 'Nomad Yearly',    price: '$840', note: '/yr — $70/mo' },
];

// All plans available on CashApp (including 3mo/6mo)
const CASHAPP_PLANS = [
  { key: 'homies_monthly', label: 'Homies Monthly',        price: '$15',  note: '/mo' },
  { key: 'homies_3mo',     label: 'Homies 3 Months',       price: '$39',  note: ' — $13/mo' },
  { key: 'homies_6mo',     label: 'Homies 6 Months',       price: '$72',  note: ' — $12/mo' },
  { key: 'homies_yearly',  label: 'Homies Yearly',         price: '$144', note: ' — $12/mo' },
  { key: 'nomad_monthly',  label: 'Nomad Monthly',         price: '$100', note: '/mo' },
  { key: 'nomad_3mo',      label: 'Nomad 3 Months',        price: '$270', note: ' — $90/mo' },
  { key: 'nomad_6mo',      label: 'Nomad 6 Months',        price: '$480', note: ' — $80/mo' },
  { key: 'nomad_yearly',   label: 'Nomad Yearly',          price: '$840', note: ' — $70/mo' },
];

// CashApp green
const CA_GREEN = '#00D64F';

const CashAppIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm1.25 17.5v.75a.75.75 0 01-1.5 0v-.793a5.252 5.252 0 01-2.898-1.357.75.75 0 111.03-1.09c.51.48 1.2.802 1.994.866V13.1c-1.854-.43-3.126-1.33-3.126-3.1 0-1.705 1.24-2.823 3.126-3.049V6.25a.75.75 0 011.5 0v.725c.9.114 1.686.45 2.284.963a.75.75 0 11-.99 1.126 2.69 2.69 0 00-1.544-.727v2.538c1.91.432 3.248 1.32 3.248 3.175 0 1.77-1.272 2.928-3.124 3.45zM11 9.098c-.94.196-1.376.74-1.376 1.352 0 .626.422 1.07 1.376 1.326V9.098zm1.5 5.728v-2.75c.997.232 1.498.794 1.498 1.376 0 .618-.46 1.13-1.498 1.374z"/>
  </svg>
);

const MembershipUpgradeModal = ({ open, onClose, post }) => {
  const [tab, setTab] = useState('card'); // 'card' | 'cashapp'

  // Card state
  const [selectedStripe, setSelectedStripe] = useState(0);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [stripeError, setStripeError] = useState('');

  // CashApp state
  const [selectedCashApp, setSelectedCashApp] = useState(0);
  const [loadingCashApp, setLoadingCashApp] = useState(false);
  const [cashAppCode, setCashAppCode] = useState(null); // { uniqueCode, amount, planLabel }
  const [cashAppError, setCashAppError] = useState('');

  if (!open) return null;

  const handleStripe = async () => {
    setStripeError('');
    setLoadingStripe(true);
    try {
      const chosen = STRIPE_PLANS[selectedStripe];
      const { data } = await api.post('/subscription/checkout', {
        plan: chosen.plan,
        billingCycle: chosen.billingCycle,
      });
      const url = data?.result?.url;
      if (url) window.location.href = url;
      else setStripeError('Could not start checkout. Try again.');
    } catch (err) {
      setStripeError(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoadingStripe(false);
    }
  };

  const handleCashApp = async () => {
    setCashAppError('');
    setLoadingCashApp(true);
    try {
      const chosen = CASHAPP_PLANS[selectedCashApp];
      const { data } = await api.post('/subscription/cashapp', { plan: chosen.key });
      if (data?.ok) {
        setCashAppCode({ uniqueCode: data.uniqueCode, amount: data.amount, planLabel: data.planLabel });
      } else {
        setCashAppError('Could not create request. Try again.');
      }
    } catch (err) {
      setCashAppError(err?.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoadingCashApp(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Video context header */}
        {post && (
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            {post.thumbnail && (
              <img src={post.thumbnail} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 opacity-80" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-sm leading-snug line-clamp-2">
                {post.title || post.description?.slice(0, 80) || 'Exclusive Content'}
              </p>
              <p className="text-white/40 text-xs mt-0.5">@{post.user?.username}</p>
            </div>
            <button onClick={onClose} className="shrink-0 text-white/30 hover:text-white/70 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="p-5">
          {/* Heading */}
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-5 w-5 text-[#F0B94D] shrink-0" />
            <h3 className="text-white font-bold text-base">Upgrade to keep watching</h3>
          </div>
          <p className="text-white/50 text-sm mb-4">
            Members only content. Choose how you'd like to subscribe.
          </p>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab('card')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border font-semibold text-sm transition-all",
                tab === 'card'
                  ? "bg-white text-black border-white"
                  : "bg-white/5 text-white/60 border-white/10 hover:border-white/20"
              )}
            >
              <CreditCard className="h-4 w-4" />
              Pay with Card
            </button>
            <button
              onClick={() => setTab('cashapp')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border font-semibold text-sm transition-all",
                tab === 'cashapp'
                  ? "border-[#00D64F] text-black"
                  : "bg-white/5 text-white/60 border-white/10 hover:border-[#00D64F]/50 hover:text-[#00D64F]"
              )}
              style={tab === 'cashapp' ? { backgroundColor: CA_GREEN } : {}}
            >
              <CashAppIcon size={16} />
              CashApp
            </button>
          </div>

          {/* ── CARD TAB ──────────────────────────────────────────────── */}
          {tab === 'card' && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {STRIPE_PLANS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedStripe(i)}
                    className={cn(
                      "relative text-left p-3 rounded-xl border transition-all",
                      selectedStripe === i
                        ? "border-[#F0B94D] bg-[#F0B94D]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    )}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 left-3 bg-[#F0B94D] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                        Popular
                      </span>
                    )}
                    <p className="text-white text-xs font-semibold leading-tight">{p.label}</p>
                    <p className="text-[#F0B94D] text-sm font-bold mt-0.5">
                      {p.price}<span className="text-white/40 text-xs font-normal">{p.note}</span>
                    </p>
                  </button>
                ))}
              </div>
              {stripeError && <p className="text-red-400 text-xs mb-3">{stripeError}</p>}
              <Button
                onClick={handleStripe}
                disabled={loadingStripe}
                className="w-full bg-[#F0B94D] hover:bg-[#e0a83a] text-black font-bold h-12 text-base rounded-xl"
              >
                {loadingStripe
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><CreditCard className="h-4 w-4 mr-2" />Subscribe — {STRIPE_PLANS[selectedStripe].price}{STRIPE_PLANS[selectedStripe].note}</>
                }
              </Button>
            </>
          )}

          {/* ── CASHAPP TAB ───────────────────────────────────────────── */}
          {tab === 'cashapp' && (
            <>
              {!cashAppCode ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {CASHAPP_PLANS.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedCashApp(i)}
                        className={cn(
                          "relative text-left p-3 rounded-xl border transition-all",
                          selectedCashApp === i
                            ? "border-[#00D64F] bg-[#00D64F]/10"
                            : "border-white/10 bg-white/5 hover:border-[#00D64F]/40"
                        )}
                      >
                        <p className="text-white text-xs font-semibold leading-tight">{p.label}</p>
                        <p className="font-bold text-sm mt-0.5" style={{ color: CA_GREEN }}>
                          {p.price}<span className="text-white/40 text-xs font-normal">{p.note}</span>
                        </p>
                      </button>
                    ))}
                  </div>
                  {cashAppError && <p className="text-red-400 text-xs mb-3">{cashAppError}</p>}
                  <Button
                    onClick={handleCashApp}
                    disabled={loadingCashApp}
                    className="w-full font-bold h-12 text-base rounded-xl text-black"
                    style={{ backgroundColor: CA_GREEN }}
                  >
                    {loadingCashApp
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <><CashAppIcon size={18} /><span className="ml-2">Get Payment Instructions</span></>
                    }
                  </Button>
                </>
              ) : (
                /* Payment instructions after code is generated */
                <div>
                  <div className="bg-[#00D64F]/10 border border-[#00D64F]/30 rounded-xl p-4 mb-4">
                    <p className="text-white font-semibold text-sm mb-3">Send your payment</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-xs">CashApp</span>
                      <span className="text-white font-bold text-lg">$homieshub</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/50 text-xs">Amount</span>
                      <span className="font-bold text-lg" style={{ color: CA_GREEN }}>${cashAppCode.amount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-xs">Memo / Note</span>
                      <span className="text-white font-mono font-bold text-base tracking-widest bg-white/10 px-2 py-0.5 rounded-lg">
                        {cashAppCode.uniqueCode}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-white/5 rounded-xl p-3 mb-4">
                    <Check className="h-4 w-4 text-[#00D64F] shrink-0 mt-0.5" />
                    <p className="text-white/70 text-xs leading-relaxed">
                      Include <strong className="text-white">{cashAppCode.uniqueCode}</strong> in the CashApp memo. Once we verify your payment, your account will be activated automatically — usually within a few minutes.
                    </p>
                  </div>
                  <button
                    onClick={() => setCashAppCode(null)}
                    className="w-full text-center text-white/30 hover:text-white/60 text-xs underline"
                  >
                    ← Choose a different plan
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembershipUpgradeModal;
