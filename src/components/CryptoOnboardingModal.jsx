import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DollarSign, Zap, Smartphone, CreditCard,
  ArrowRight, ArrowLeft, CheckCircle2, ExternalLink, Wallet
} from 'lucide-react';

const STEPS = [
  {
    id: 'intro',
    icon: DollarSign,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Wagers use real dollars',
    subtitle: 'No casino chips. No vouchers.',
    body: `When you join a wager on The Homies Hub, you're betting with actual US dollars — held safely on a blockchain until the outcome is settled.

It sounds technical, but it works like this: you put in $10, someone else puts in $10. The winner automatically gets ~$19.40 sent to their phone wallet. No waiting, no "contact support to withdraw".`,
    note: 'This takes about 3 minutes to set up.',
  },
  {
    id: 'usdc',
    icon: DollarSign,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    title: 'The currency: USDC',
    subtitle: 'Always worth $1.00 — no surprises.',
    body: `USDC (USD Coin) is a digital dollar. It's issued by Circle — a US-regulated company — and every single USDC is backed by a real US dollar in a bank.

Unlike Bitcoin or Ethereum, USDC never goes up or down in value. If you lock $25 in a wager, you're always looking at $25 — not $18 tomorrow because crypto dipped.`,
    highlight: '1 USDC = $1.00 USD. Always.',
  },
  {
    id: 'algorand',
    icon: Zap,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'The network: Algorand',
    subtitle: 'Fast, cheap, trusted.',
    body: `USDC lives on many blockchains. We use Algorand because:

• Transactions confirm in ~4 seconds
• Fees are less than a cent (usually $0.001)
• It's carbon-negative and built for real-world finance
• Coinbase, Circle, and major institutions use it

Think of Algorand like the payment rails — like Visa or ACH — but open and automatic.`,
    note: "You don't need to understand blockchains. Your Pera Wallet handles all of it.",
  },
  {
    id: 'getusdc',
    icon: CreditCard,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
    title: 'Step 1 — Get USDC',
    subtitle: 'Buy from any major exchange.',
    body: `The easiest way for beginners is Coinbase. You can use a debit card, bank transfer, or Apple Pay.`,
    exchanges: [
      { name: 'Coinbase', desc: 'Easiest for beginners. US bank/card.', url: 'https://coinbase.com', recommended: true },
      { name: 'Kraken', desc: 'Great rates. Wire + card.', url: 'https://kraken.com' },
      { name: 'Binance', desc: 'Largest exchange globally.', url: 'https://binance.com' },
      { name: 'Crypto.com', desc: 'Fast card purchases.', url: 'https://crypto.com' },
    ],
    note: '⚠️ When withdrawing from the exchange, select Algorand (ALGO) as the network — NOT Ethereum or Solana.',
  },
  {
    id: 'wallet',
    icon: Smartphone,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: 'Step 2 — Install Pera Wallet',
    subtitle: 'Your personal crypto wallet.',
    body: `Pera Wallet is the official Algorand mobile wallet. It holds your USDC, signs wager transactions, and receives your winnings automatically.

Download it free from the App Store or Google Play. Create a new wallet — write down your 25-word recovery phrase and keep it somewhere safe (not a screenshot).`,
    walletLinks: [
      { label: 'App Store (iPhone)', url: 'https://apps.apple.com/app/pera-algo-wallet/id1459898369' },
      { label: 'Google Play (Android)', url: 'https://play.google.com/store/apps/details?id=com.algorand.android' },
    ],
    note: 'Your 25-word phrase = your money. Anyone who has it can access your funds. Never share it.',
  },
  {
    id: 'fund',
    icon: Wallet,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
    title: 'Step 3 — Fund your wallet',
    subtitle: 'Send USDC from the exchange to Pera.',
    steps: [
      'Open Pera Wallet and copy your Algorand address (starts with a letter, ~58 characters).',
      'Go to your exchange (e.g. Coinbase) → Withdraw → USDC.',
      'Paste your Pera address as the destination.',
      'Select "Algorand" network (not Ethereum/Solana — wrong network = lost funds).',
      'Send your amount. It arrives in Pera Wallet in under 10 seconds.',
    ],
    note: 'Also send a tiny amount of ALGO (0.5 ALGO ≈ $0.15) to cover transaction fees.',
  },
  {
    id: 'ready',
    icon: CheckCircle2,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10',
    title: "You're ready to wager",
    subtitle: 'Connect your wallet and start.',
    body: `Once your USDC is in Pera Wallet:

1. Come back here and click "Connect Wallet"
2. Scan the QR code with Pera Wallet
3. Browse wagers and click "Join"
4. Approve the transaction in Pera — done.

Your stake goes into escrow. When the wager resolves, winnings land in your Pera Wallet automatically.`,
  },
];

const CryptoOnboardingModal = ({ isOpen, onOpenChange, onConnectWallet }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === STEPS.length - 1;
  const Icon    = current.icon;

  const handleConnect = () => {
    onOpenChange(false);
    onConnectWallet?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-zinc-950 border border-white/10 p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* Step counter */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {step + 1} of {STEPS.length}
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground hover:text-white transition-colors"
            >
              Skip for now
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Icon + title */}
              <div className="flex items-center gap-3">
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', current.iconBg)}>
                  <Icon className={cn('h-5 w-5', current.iconColor)} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">{current.title}</h2>
                  <p className="text-xs text-muted-foreground">{current.subtitle}</p>
                </div>
              </div>

              {/* Body text */}
              {current.body && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {current.body}
                </p>
              )}

              {/* Highlight callout */}
              {current.highlight && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-semibold text-sm text-center">
                  {current.highlight}
                </div>
              )}

              {/* Exchange list */}
              {current.exchanges && (
                <div className="space-y-2">
                  {current.exchanges.map((ex) => (
                    <a
                      key={ex.name}
                      href={ex.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-all hover:border-primary/40',
                        ex.recommended
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-zinc-900 border-white/10'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{ex.name}</span>
                          {ex.recommended && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{ex.desc}</p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              )}

              {/* Wallet download links */}
              {current.walletLinks && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {current.walletLinks.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/20 transition-all"
                    >
                      <Smartphone className="h-4 w-4" />
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              )}

              {/* Numbered steps */}
              {current.steps && (
                <div className="space-y-2">
                  {current.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Note */}
              {current.note && (
                <p className="text-xs text-muted-foreground/70 bg-zinc-900 border border-white/5 rounded-lg px-3 py-2">
                  {current.note}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center gap-3 pt-1">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                className="border-white/10 text-muted-foreground hover:text-white gap-1"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}
            <div className="flex-1" />

            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === step ? 'w-4 bg-primary' : 'w-1.5 bg-white/20'
                  )}
                />
              ))}
            </div>
            <div className="flex-1" />

            {isLast ? (
              <Button
                onClick={handleConnect}
                className="bg-primary text-black hover:bg-primary/90 font-bold gap-2"
              >
                <Wallet className="h-4 w-4" /> Connect Wallet
              </Button>
            ) : (
              <Button
                onClick={() => setStep((s) => s + 1)}
                className="bg-primary text-black hover:bg-primary/90 font-bold gap-1"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CryptoOnboardingModal;
