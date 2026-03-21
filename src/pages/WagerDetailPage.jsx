import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, Users, Trophy, Swords, Zap, CheckCircle2,
  Wallet, Share2, Flag, Loader2, UserCheck, BarChart3,
  HelpCircle, DollarSign, BookOpen, ShieldCheck, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatUSDC } from '@/lib/algorand';
import { useWager } from '@/contexts/WagerContext';
import { MOCK_WAGERS } from '@/data/mockWagers';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import JoinWagerModal from '@/components/JoinWagerModal';
import USDInfoBadge from '@/components/USDInfoBadge';
import { useToast } from '@/components/ui/use-toast';

// ─── Config ──────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  CONTENT_BATTLE: { label: 'Content Battle', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Zap },
  SOCIAL:         { label: 'Social Bet',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Users },
  EVENT:          { label: 'Event',          color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Trophy },
  DUEL:           { label: 'Duel',           color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Swords },
};

const TABS = [
  { id: 'wager',    label: 'Wager',        icon: Swords },
  { id: 'payouts',  label: 'Payouts',      icon: DollarSign },
  { id: 'how',      label: 'How It Works', icon: BookOpen },
  { id: 'faq',      label: 'FAQ',          icon: HelpCircle },
];

const timeLeft = (expiresAt) => {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
};

// ─── Dynamic content generators ──────────────────────────────────────────────

const getHowItWorks = (wager) => {
  const isP2P  = wager.bettingMode === 'P2P';
  const isPool = wager.bettingMode === 'POOL';

  const modeExplain = isP2P
    ? 'This is a **peer-to-peer** wager — exactly two people go head to head. Both must lock the same amount of USDC. The winner takes the full pot minus the platform fee.'
    : 'This is a **pool wager** — anyone can join by picking a side and locking any amount of USDC above the minimum. The pot grows as more people join. When the outcome is decided, everyone who picked the winning side gets paid out proportionally to how much they staked.';

  const typeSteps = {
    CONTENT_BATTLE: [
      'Both creators (or sides) submit their content.',
      'A voting period opens — anyone can cast a vote for the best submission.',
      'When voting closes, the side with the most votes is declared the winner.',
      'Funds are automatically released from escrow to all winners.',
    ],
    SOCIAL: [
      'Two people agree on a real-life outcome and set the terms.',
      'Both sides lock their USDC into Algorand escrow — nobody can touch it until resolution.',
      'When the outcome happens (or the deadline passes), both parties confirm the result.',
      'If both agree → funds auto-release. If there\'s a dispute → platform steps in as arbiter.',
    ],
    DUEL: [
      'The challenger creates the wager and locks their stake.',
      'An opponent accepts by locking the same amount.',
      'The challenge plays out (as defined in the terms).',
      'The designated arbiter confirms the winner and the contract releases funds.',
    ],
    EVENT: [
      'The platform creates a multi-outcome event (e.g. a boxing card).',
      'Users pick any outcome and lock their stake into that outcome\'s pool.',
      'When the event happens, the platform posts the official result.',
      'All winners share the losing pools proportionally minus the platform fee.',
    ],
  };

  return { modeExplain, steps: typeSteps[wager.type] || typeSteps.SOCIAL };
};

const getPayoutExplain = (wager) => {
  const isP2P  = wager.bettingMode === 'P2P';
  const fee    = wager.feePercent ?? 3;
  const pot    = wager.totalPot ?? 0;
  const feeAmt = (pot * fee / 100).toFixed(2);
  const payout = (pot * (1 - fee / 100)).toFixed(2);

  if (isP2P) {
    return {
      title: 'Winner Takes All',
      summary: `Both players lock ${formatUSDC(wager.stakeAmount)} each. The winner receives ${formatUSDC(Number(payout))} after the ${fee}% platform fee.`,
      breakdown: [
        { label: 'Player A stake',    value: formatUSDC(wager.stakeAmount), note: '' },
        { label: 'Player B stake',    value: formatUSDC(wager.stakeAmount), note: 'must match exactly' },
        { label: `Platform fee (${fee}%)`, value: `−${formatUSDC(Number(feeAmt))}`, note: 'goes to platform' },
        { label: 'Winner receives',   value: formatUSDC(Number(payout)), highlight: true },
      ],
    };
  }

  return {
    title: 'Proportional Payout',
    summary: `The total pot is ${formatUSDC(pot)}. After the ${fee}% platform fee, ${formatUSDC(Number(payout))} is split among winners proportionally — the more you staked, the more you win.`,
    breakdown: [
      { label: 'Total pot',          value: formatUSDC(pot), note: '' },
      { label: `Platform fee (${fee}%)`, value: `−${formatUSDC(Number(feeAmt))}`, note: 'goes to platform' },
      { label: 'Winner pool',        value: formatUSDC(Number(payout)), note: 'split proportionally' },
      { label: 'Your share',         value: 'Based on your stake %', highlight: true },
    ],
  };
};

const getFAQ = (wager) => {
  const isP2P = wager.bettingMode === 'P2P';
  const isVote = wager.resolutionMethod === 'VOTE';
  const isMutual = wager.resolutionMethod === 'MUTUAL';

  return [
    {
      q: 'Is my money safe?',
      a: 'Yes. Your USDC is locked in a smart contract on the Algorand blockchain the moment you join. Nobody — not even the platform — can touch it until the outcome is officially resolved. The contract code enforces the rules automatically.',
    },
    {
      q: 'What is USDC?',
      a: 'USDC (USD Coin) is a stablecoin — a cryptocurrency always worth $1.00 USD. It\'s issued by Circle and backed 1:1 with US dollars. Using USDC means there\'s no crypto price volatility — if you lock $10, you\'re always betting $10.',
    },
    ...(isP2P ? [{
      q: 'What if nobody accepts my challenge?',
      a: 'If no opponent joins before the expiry date, your full stake is automatically returned to your wallet. You never lose money on an unmatched wager.',
    }] : [{
      q: 'What if the pot is small?',
      a: 'Pool wagers stay open until the expiry date, so more people can join and grow the pot. Even a small pot pays out — your share just depends on how much you staked relative to other winners.',
    }]),
    {
      q: 'How do I get paid after winning?',
      a: 'Once the outcome is resolved on-chain, a "Claim Payout" button appears on this page. Click it, approve the transaction in your Pera Wallet, and your USDC arrives in your wallet within seconds.',
    },
    ...(isMutual ? [{
      q: 'What if both sides can\'t agree on the result?',
      a: 'If both parties submit different outcomes, the wager enters a dispute state. The platform reviews the evidence and the original terms, then posts the final resolution. Funds are released based on that decision.',
    }] : []),
    ...(isVote ? [{
      q: 'How does voting work?',
      a: 'Any connected wallet can cast one vote per wager. Votes are recorded on-chain and cannot be changed. When the voting period closes, the outcome with the most votes wins and funds are released automatically.',
    }] : []),
    {
      q: 'What happens if the wager expires unresolved?',
      a: 'If the deadline passes without a resolution, every participant automatically gets their full stake refunded. No fees are charged on expired wagers.',
    },
    {
      q: 'Do I need to opt in to receive USDC?',
      a: 'Yes — Algorand requires a one-time opt-in transaction for any new asset (including USDC). Your Pera Wallet will prompt you to do this automatically the first time you join a wager. It costs a tiny amount of ALGO (about 0.002 ALGO) for the opt-in.',
    },
  ];
};

// ─── Tab content components ───────────────────────────────────────────────────

const WagerTab = ({ wager, user, connectedWallet, onJoin, onVote, onDispute, isCasting, votingFor, onLoginRequest }) => {
  const isOpen     = wager.status === 'OPEN';
  const isActive   = wager.status === 'ACTIVE';
  const isResolved = wager.status === 'RESOLVED';
  const isVotable  = wager.resolutionMethod === 'VOTE' && (isOpen || isActive);
  const canJoin    = isOpen && user;
  const feeAmt     = (wager.totalPot * (wager.feePercent / 100)).toFixed(2);
  const payoutPool = (wager.totalPot * (1 - wager.feePercent / 100)).toFixed(2);

  return (
    <div className="space-y-5">
      {/* Outcome pools */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outcomes</p>
        {wager.outcomeOptions?.map((option, i) => {
          const pool = wager.pools?.[i];
          const pct  = wager.totalPot > 0 && pool ? Math.round((pool.total / wager.totalPot) * 100) : 0;
          const isWinner = isResolved && wager.winner === i;
          return (
            <div key={i} className={cn('p-4 rounded-xl border', isWinner ? 'border-primary/40 bg-primary/5' : 'border-white/10 bg-black/20')}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('font-semibold text-sm', isWinner ? 'text-primary' : 'text-white')}>
                  {isWinner && <CheckCircle2 className="inline h-4 w-4 mr-1.5" />}
                  {option}
                </span>
                <div className="text-right">
                  <div className="text-sm font-bold text-primary">{formatUSDC(pool?.total || 0)}</div>
                  <div className="text-[10px] text-muted-foreground">{pool?.count || 0} {pool?.count === 1 ? 'bettor' : 'bettors'}</div>
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', isWinner ? 'bg-primary' : 'bg-white/20')}
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">{pct}% of pot</span>
                {isVotable && user && (
                  <Button size="sm" variant="outline"
                    className="h-6 text-[10px] px-3 border-white/20 hover:border-primary/50 hover:text-primary"
                    onClick={() => onVote(i)} disabled={isCasting}
                  >
                    {isCasting && votingFor === i ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Vote'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fee line */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="text-muted-foreground">Platform fee ({wager.feePercent}%)</span>
        <span className="text-muted-foreground">{formatUSDC(Number(feeAmt))}</span>
      </div>

      {/* Participants */}
      {wager.participants?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Participants</p>
          <div className="bg-zinc-900 rounded-xl border border-white/10 divide-y divide-white/5">
            {wager.participants.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {p.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-white">@{p.username}</span>
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-white/5">
                    {wager.outcomeOptions?.[p.side] || `Side ${p.side + 1}`}
                  </span>
                </div>
                <span className="text-sm font-bold text-primary">{formatUSDC(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        {/* Not logged in — prompt to sign in */}
        {!user && isOpen && (
          <div className="flex-1 p-4 rounded-xl bg-zinc-900 border border-primary/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Swords className="h-5 w-5 text-primary shrink-0" />
              <span>Sign in to join this wager</span>
            </div>
            <Button size="sm" onClick={onLoginRequest}
              className="bg-primary text-black hover:bg-primary/90 font-semibold shrink-0"
            >
              Sign In
            </Button>
          </div>
        )}
        {canJoin && (
          !connectedWallet ? (
            <div className="flex-1 p-4 rounded-xl bg-zinc-900 border border-white/10 flex items-center gap-3 text-sm text-muted-foreground">
              <Wallet className="h-5 w-5 text-primary shrink-0" />
              Connect your Pera Wallet to join.
            </div>
          ) : (
            <Button onClick={onJoin}
              className="flex-1 h-12 bg-primary text-black hover:bg-primary/90 font-bold text-base gap-2 shadow-[0_0_20px_rgba(240,185,77,0.15)]"
            >
              <Swords className="h-5 w-5" /> Join This Wager
            </Button>
          )
        )}
        {isResolved && (
          <div className="flex-1 flex items-center justify-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/20 text-primary font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            Settled — {wager.outcomeOptions?.[wager.winner] || 'N/A'}
          </div>
        )}
        {user && (isOpen || isActive) && (
          <Button variant="outline" onClick={onDispute}
            className="border-red-500/20 hover:bg-red-500/10 text-red-400 gap-2 h-12"
          >
            <Flag className="h-4 w-4" /> Dispute
          </Button>
        )}
      </div>
    </div>
  );
};

const PayoutsTab = ({ wager }) => {
  const info = getPayoutExplain(wager);
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-white">{info.title}</h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{info.summary}</p>
      </div>

      <div className="bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden">
        {info.breakdown.map((row, i) => (
          <div key={i} className={cn(
            'flex items-center justify-between px-5 py-3.5 border-b border-white/5 last:border-0',
            row.highlight && 'bg-primary/5'
          )}>
            <div>
              <span className={cn('text-sm font-medium', row.highlight ? 'text-primary' : 'text-white')}>{row.label}</span>
              {row.note && <span className="text-[10px] text-muted-foreground ml-2">{row.note}</span>}
            </div>
            <span className={cn('font-bold', row.highlight ? 'text-primary text-base' : 'text-white text-sm')}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Visual flow */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Money Flow</p>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white font-medium">
            Your USD
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
            Algorand Escrow
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-muted-foreground text-xs">
            {wager.feePercent}% fee
            <br /><span className="text-[10px]">to platform</span>
          </div>
          <span className="text-muted-foreground">→</span>
          <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-bold">
            Winner(s)
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Funds move directly on the Algorand blockchain. No intermediary holds your money at any point — the smart contract enforces every step automatically.
        </p>
      </div>
    </div>
  );
};

const HowTab = ({ wager }) => {
  const { modeExplain, steps } = getHowItWorks(wager);
  const isP2P = wager.bettingMode === 'P2P';

  return (
    <div className="space-y-6">
      {/* Mode explanation */}
      <div className={cn(
        'p-4 rounded-xl border',
        isP2P ? 'bg-primary/5 border-primary/20' : 'bg-green-500/5 border-green-500/20'
      )}>
        <div className="flex items-center gap-2 mb-2">
          {isP2P
            ? <UserCheck className="h-4 w-4 text-primary" />
            : <BarChart3 className="h-4 w-4 text-green-400" />}
          <span className={cn('text-sm font-bold', isP2P ? 'text-primary' : 'text-green-400')}>
            {isP2P ? 'Peer-to-Peer Wager' : 'Pool Wager'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {modeExplain.replace(/\*\*(.*?)\*\*/g, '$1')}
        </p>
      </div>

      {/* Step by step */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Step by Step</p>
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-3"
          >
            <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{step}</p>
          </motion.div>
        ))}
      </div>

      {/* Resolution method */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-white">Resolution Method</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {wager.resolutionMethod === 'MUTUAL' && 'Both parties must agree on the same outcome. If they disagree, the platform acts as a final arbiter.'}
          {wager.resolutionMethod === 'ARBITER' && 'A designated arbiter (or the platform) posts the official outcome. Once confirmed, funds release automatically.'}
          {wager.resolutionMethod === 'VOTE' && 'The community votes on the outcome. Each wallet gets one vote. When voting closes, the majority wins and funds are released.'}
        </p>
      </div>
    </div>
  );
};

const FAQTab = ({ wager }) => {
  const [open, setOpen] = useState(null);
  const faqs = getFAQ(wager);

  return (
    <div className="space-y-2">
      {faqs.map((item, i) => (
        <div key={i} className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-white pr-4">{item.q}</span>
            <motion.div animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
              <AlertCircle className={cn('h-4 w-4', open === i ? 'text-primary' : 'text-muted-foreground')} />
            </motion.div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm text-muted-foreground leading-relaxed px-4 pb-4 border-t border-white/5 pt-3">
                  {item.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const WagerDetailPage = ({ onLoginRequest }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchWager, castVote, disputeWager } = useWager();
  const { user } = useAuth();
  const { connectedWallet } = useWallet();
  const { toast } = useToast();

  const [loading, setLoading]     = useState(true);
  const [wager, setWager]         = useState(null);
  const [activeTab, setActiveTab] = useState('wager');
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [votingFor, setVotingFor] = useState(null);
  const [isCasting, setIsCasting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const result = await fetchWager(id);
      setWager(result || MOCK_WAGERS.find((w) => w._id === id) || null);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleVote = async (outcomeIndex) => {
    if (!user || isCasting) return;
    setVotingFor(outcomeIndex);
    setIsCasting(true);
    try { await castVote(wager._id, outcomeIndex); }
    finally { setIsCasting(false); }
  };

  const handleDispute = async () => {
    if (!user) return;
    await disputeWager(wager._id, 'Outcome disputed by participant');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!wager) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <Swords className="h-12 w-12 text-white/20" />
        <p className="text-muted-foreground">Wager not found.</p>
        <Button variant="outline" onClick={() => navigate('/wagers')} className="border-white/20 text-white">
          Back to Wagers
        </Button>
      </div>
    );
  }

  const type    = TYPE_CONFIG[wager.type] || TYPE_CONFIG.SOCIAL;
  const TypeIcon = type.icon;
  const isOpen     = wager.status === 'OPEN';
  const isActive   = wager.status === 'ACTIVE';
  const isResolved = wager.status === 'RESOLVED';

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Back */}
        <button onClick={() => navigate('/wagers')}
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Wagers
        </button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-3"
        >
          {/* Type + mode + status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border', type.bg, type.color)}>
              <TypeIcon className="h-3 w-3" /> {type.label}
            </span>
            {wager.bettingMode && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border',
                wager.bettingMode === 'P2P' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-green-500/10 border-green-500/20 text-green-400'
              )}>
                {wager.bettingMode === 'P2P' ? <><UserCheck className="h-3 w-3" /> P2P</> : <><BarChart3 className="h-3 w-3" /> Pool</>}
              </span>
            )}
            <span className={cn('text-xs flex items-center gap-1.5 font-medium',
              isOpen ? 'text-green-400' : isActive ? 'text-yellow-400' : isResolved ? 'text-primary' : 'text-muted-foreground'
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', isOpen ? 'bg-green-400' : isActive ? 'bg-yellow-400' : isResolved ? 'bg-primary' : 'bg-zinc-500')} />
              {wager.status.charAt(0) + wager.status.slice(1).toLowerCase()}
            </span>
          </div>

          {/* Title + pot */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold text-white leading-snug flex-1">{wager.title}</h1>
            <div className="text-right shrink-0">
              <USDInfoBadge amount={wager.totalPot} size="lg" className="text-primary" />
              <div className="text-[10px] text-muted-foreground">total pot</div>
            </div>
          </div>

          {/* Terms */}
          <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3">
            {wager.terms}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {wager.participants?.length || 0} participant{wager.participants?.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeLeft(wager.expiresAt)}</span>
            <span>@{wager.creator?.username}</span>
          </div>

          {/* Share */}
          <Button variant="ghost" size="sm"
            className="text-muted-foreground hover:text-white gap-2 px-0 h-auto text-xs"
            onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: 'Link copied!' }); }}
          >
            <Share2 className="h-3 w-3" /> Share this wager
          </Button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-primary text-black'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'wager'   && <WagerTab wager={wager} user={user} connectedWallet={connectedWallet} onJoin={() => setIsJoinOpen(true)} onVote={handleVote} onDispute={handleDispute} isCasting={isCasting} votingFor={votingFor} onLoginRequest={onLoginRequest} />}
            {activeTab === 'payouts' && <PayoutsTab wager={wager} />}
            {activeTab === 'how'     && <HowTab wager={wager} />}
            {activeTab === 'faq'     && <FAQTab wager={wager} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <JoinWagerModal isOpen={isJoinOpen} onOpenChange={setIsJoinOpen} wager={wager} />
    </div>
  );
};

export default WagerDetailPage;
