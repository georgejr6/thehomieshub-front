import React, { useState } from 'react';
import { Crown, CreditCard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';

const PLANS = [
  { plan: 'homies', billingCycle: 'monthly', label: 'Homies Monthly', price: '$15/mo',  popular: true },
  { plan: 'homies', billingCycle: 'yearly',  label: 'Homies Yearly',  price: '$144/yr', note: '$12/mo' },
  { plan: 'nomad',  billingCycle: 'monthly', label: 'Digital Nomad Monthly', price: '$100/mo' },
  { plan: 'nomad',  billingCycle: 'yearly',  label: 'Digital Nomad Yearly',  price: '$840/yr', note: '$70/mo' },
];

const MembershipUpgradeModal = ({ open, onClose, post }) => {
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [showCashApp, setShowCashApp] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const chosen = PLANS[selectedPlan];

  const handleStripe = async () => {
    setError('');
    setLoadingStripe(true);
    try {
      const { data } = await api.post('/subscription/checkout', {
        plan: chosen.plan,
        billingCycle: chosen.billingCycle,
      });
      const url = data?.result?.url;
      if (url) window.location.href = url;
      else setError('Could not start checkout. Please try again.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoadingStripe(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
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
            This video is for members only. Choose a plan to watch in full and unlock all member content.
          </p>

          {!showCashApp ? (
            <>
              {/* Plan selector */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PLANS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPlan(i)}
                    className={cn(
                      "relative text-left p-3 rounded-xl border transition-all",
                      selectedPlan === i
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
                    <p className="text-[#F0B94D] text-sm font-bold mt-0.5">{p.price}</p>
                    {p.note && <p className="text-white/30 text-[10px]">{p.note}</p>}
                  </button>
                ))}
              </div>

              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

              {/* Stripe button */}
              <Button
                onClick={handleStripe}
                disabled={loadingStripe}
                className="w-full bg-[#F0B94D] hover:bg-[#e0a83a] text-black font-bold h-12 text-base rounded-xl mb-3"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {loadingStripe ? 'Loading…' : `Subscribe with Card — ${chosen.price}`}
              </Button>

              {/* CashApp toggle */}
              <button
                onClick={() => setShowCashApp(true)}
                className="w-full text-center text-white/40 hover:text-white/70 text-sm underline"
              >
                Pay with CashApp instead
              </button>
            </>
          ) : (
            <>
              {/* CashApp instructions */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-white font-semibold text-sm mb-2">Pay via CashApp</p>
                <p className="text-[#F0B94D] text-2xl font-bold mb-1">$homieshub</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Send your payment and include your TheHomiesHub username in the note.
                  Then message our Telegram bot to complete your signup.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {PLANS.map((p, i) => (
                  <div key={i} className="text-left p-3 rounded-xl border border-white/10 bg-white/5">
                    <p className="text-white text-xs font-semibold leading-tight">{p.label}</p>
                    <p className="text-[#F0B94D] text-sm font-bold mt-0.5">{p.price}</p>
                  </div>
                ))}
              </div>

              <a
                href="https://t.me/homieshub_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button className="w-full bg-[#27A7E7] hover:bg-[#1e96d4] text-white font-bold h-12 text-base rounded-xl mb-3">
                  Message us on Telegram →
                </Button>
              </a>

              <button
                onClick={() => setShowCashApp(false)}
                className="w-full text-center text-white/40 hover:text-white/70 text-sm underline"
              >
                ← Back to card payment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembershipUpgradeModal;
