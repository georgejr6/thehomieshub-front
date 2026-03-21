import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Swords, Users, Trophy, Zap, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2, UserCheck, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWager } from '@/contexts/WagerContext';
import { useWallet } from '@/contexts/WalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatAlgo } from '@/lib/algorand';

const WAGER_TYPES = [
  { id: 'CONTENT_BATTLE', label: 'Content Battle', desc: 'Both sides submit content. Community votes on the winner.', icon: Zap, color: 'border-purple-500/40 bg-purple-500/5 hover:border-purple-500/70', activeColor: 'border-purple-500 bg-purple-500/20', iconColor: 'text-purple-400', defaultFee: 5 },
  { id: 'SOCIAL', label: 'Social Bet', desc: 'Freeform real-life bet between two people. e.g. "He won\'t go to Japan"', icon: Users, color: 'border-blue-500/40 bg-blue-500/5 hover:border-blue-500/70', activeColor: 'border-blue-500 bg-blue-500/20', iconColor: 'text-blue-400', defaultFee: 2 },
  { id: 'DUEL', label: 'Duel', desc: 'Head to head challenge. One winner, one loser.', icon: Swords, color: 'border-red-500/40 bg-red-500/5 hover:border-red-500/70', activeColor: 'border-red-500 bg-red-500/20', iconColor: 'text-red-400', defaultFee: 3 },
  { id: 'EVENT', label: 'Event / Card', desc: 'Multi-outcome event like a fight card or sports match.', icon: Trophy, color: 'border-orange-500/40 bg-orange-500/5 hover:border-orange-500/70', activeColor: 'border-orange-500 bg-orange-500/20', iconColor: 'text-orange-400', defaultFee: 3 },
];

const RESOLUTION_METHODS = [
  { id: 'MUTUAL', label: 'Mutual Agreement', desc: 'Both parties must confirm the same outcome.' },
  { id: 'ARBITER', label: 'Designated Arbiter', desc: 'A trusted wallet address resolves the outcome.' },
  { id: 'VOTE', label: 'Community Vote', desc: 'Open voting period — most votes wins.' },
];

const BETTING_MODES = [
  {
    id: 'P2P',
    label: 'Peer to Peer',
    desc: 'Challenge one person. Both lock the same amount. Winner takes all.',
    icon: UserCheck,
    color: 'border-primary/40 bg-primary/5 hover:border-primary/70',
    activeColor: 'border-primary bg-primary/15',
    iconColor: 'text-primary',
  },
  {
    id: 'POOL',
    label: 'Pool Betting',
    desc: 'Open to everyone. Multiple participants bet on any outcome. Pot grows.',
    icon: BarChart3,
    color: 'border-green-500/40 bg-green-500/5 hover:border-green-500/70',
    activeColor: 'border-green-500 bg-green-500/15',
    iconColor: 'text-green-400',
  },
];

const STEPS = ['Type', 'Terms', 'Stakes', 'Review'];

const CreateWagerModal = ({ isOpen, onOpenChange }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: '',
    bettingMode: '',
    title: '',
    terms: '',
    outcomeOptions: ['Side A', 'Side B'],
    resolution: 'MUTUAL',
    arbiterAddress: '',
    amount: '',
    minStake: '0.1',
    challengedUsername: '',
    expiryDays: '7',
  });

  const { createWager } = useWager();
  const { connectedWallet } = useWallet();
  const { user } = useAuth();
  const { toast } = useToast();

  const selectedType = WAGER_TYPES.find((t) => t.id === form.type);
  const feePercent = selectedType?.defaultFee ?? 3;
  const isP2P = form.bettingMode === 'P2P';
  // P2P: pot = stake × 2. Pool: pot starts at stake, grows as others join
  const potAfterFee = form.amount ? (Number(form.amount) * (isP2P ? 2 : 1) * (1 - feePercent / 100)).toFixed(2) : '—';
  const platformFee = form.amount ? (Number(form.amount) * (isP2P ? 2 : 1) * (feePercent / 100)).toFixed(3) : '—';

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const updateOutcome = (i, val) => {
    const arr = [...form.outcomeOptions];
    arr[i] = val;
    setForm((f) => ({ ...f, outcomeOptions: arr }));
  };

  const canProceed = () => {
    if (step === 0) return !!form.type && !!form.bettingMode;
    if (step === 1) return form.title.trim().length > 3 && form.terms.trim().length > 5;
    if (step === 2) return Number(form.amount) >= 0.1;
    return true;
  };

  const handleSubmit = async () => {
    if (!connectedWallet) return;
    setIsSubmitting(true);
    try {
      const expiresAt = new Date(Date.now() + Number(form.expiryDays) * 24 * 60 * 60 * 1000).toISOString();
      await createWager({
        type: form.type,
        bettingMode: form.bettingMode,
        title: form.title,
        terms: form.terms,
        outcomeOptions: form.outcomeOptions,
        resolutionMethod: form.resolution,
        feePercent,
        arbiterAddress: form.arbiterAddress || undefined,
        stakeAmount: Number(form.amount),
        minStake: form.bettingMode === 'POOL' ? Number(form.minStake) : Number(form.amount),
        challengedUsername: form.bettingMode === 'P2P' ? form.challengedUsername || undefined : undefined,
        expiresAt,
        creatorAddress: connectedWallet.address,
      });
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create wager', description: err?.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setForm({ type: '', bettingMode: '', title: '', terms: '', outcomeOptions: ['Side A', 'Side B'], resolution: 'MUTUAL', arbiterAddress: '', amount: '', minStake: '0.1', challengedUsername: '', expiryDays: '7' });
  };

  const handleClose = (open) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-zinc-950 border-white/10 text-white p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Create a Wager
          </DialogTitle>
          {/* Step progress */}
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={cn('flex items-center gap-1 text-xs font-medium transition-colors', i === step ? 'text-primary' : i < step ? 'text-primary/60' : 'text-muted-foreground')}>
                  <div className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold border', i < step ? 'bg-primary border-primary text-black' : i === step ? 'border-primary text-primary' : 'border-white/20 text-muted-foreground')}>
                    {i < step ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className="hidden sm:block">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn('flex-1 h-px', i < step ? 'bg-primary/40' : 'bg-white/10')} />}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>

        <div className="px-6 py-5 min-h-[320px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* STEP 0 — Type + Betting Mode */}
              {step === 0 && (
                <div className="space-y-5">
                  {/* Wager type */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Wager Type</p>
                    <div className="grid grid-cols-2 gap-3">
                      {WAGER_TYPES.map((t) => {
                        const Icon = t.icon;
                        const active = form.type === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => update('type', t.id)}
                            className={cn('p-4 rounded-xl border text-left transition-all duration-200', active ? t.activeColor : t.color)}
                          >
                            <Icon className={cn('h-6 w-6 mb-2', t.iconColor)} />
                            <div className="font-semibold text-sm text-white">{t.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Betting mode */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Betting Mode</p>
                    <div className="grid grid-cols-2 gap-3">
                      {BETTING_MODES.map((m) => {
                        const Icon = m.icon;
                        const active = form.bettingMode === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => update('bettingMode', m.id)}
                            className={cn('p-4 rounded-xl border text-left transition-all duration-200', active ? m.activeColor : m.color)}
                          >
                            <Icon className={cn('h-6 w-6 mb-2', m.iconColor)} />
                            <div className="font-semibold text-sm text-white">{m.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{m.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1 — Terms */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-white text-sm">Wager Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => update('title', e.target.value)}
                      placeholder={selectedType?.id === 'SOCIAL' ? 'He won\'t go to Japan this year' : selectedType?.id === 'CONTENT_BATTLE' ? 'Best freestyle edit of the week' : 'Enter a clear title...'}
                      className="bg-zinc-900 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white text-sm">Full Terms</Label>
                    <Textarea
                      value={form.terms}
                      onChange={(e) => update('terms', e.target.value)}
                      placeholder="Describe the exact terms. What counts as winning? How is it verified? The more detail, the better."
                      className="bg-zinc-900 border-white/10 text-white placeholder:text-muted-foreground min-h-[90px] focus:border-primary/50 resize-none"
                      maxLength={500}
                    />
                    <span className="text-[10px] text-muted-foreground">{form.terms.length}/500</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Outcome Options</Label>
                    {form.outcomeOptions.map((opt, i) => (
                      <Input
                        key={i}
                        value={opt}
                        onChange={(e) => updateOutcome(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                        className="bg-zinc-900 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50"
                      />
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white text-sm">Resolution Method</Label>
                    <Select value={form.resolution} onValueChange={(v) => update('resolution', v)}>
                      <SelectTrigger className="bg-zinc-900 border-white/10 text-white focus:ring-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        {RESOLUTION_METHODS.map((m) => (
                          <SelectItem key={m.id} value={m.id} className="focus:bg-white/10">
                            <div>
                              <div className="font-medium">{m.label}</div>
                              <div className="text-xs text-muted-foreground">{m.desc}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* STEP 2 — Stakes */}
              {step === 2 && (
                <div className="space-y-5">

                  {/* Mode reminder pill */}
                  <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border',
                    isP2P ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-green-500/10 border-green-500/30 text-green-400'
                  )}>
                    {isP2P ? <UserCheck className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                    {isP2P ? 'P2P — Opponent must match your stake exactly' : 'Pool — Participants choose their own stake amount'}
                  </div>

                  {/* P2P: single fixed stake */}
                  {isP2P && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-white text-sm">Your Stake (USDC) — opponent matches this exactly</Label>
                        <div className="relative">
                          <Input
                            type="number" min="0.1" step="0.1"
                            value={form.amount}
                            onChange={(e) => update('amount', e.target.value)}
                            placeholder="0.00"
                            className="bg-zinc-900 border-white/10 text-white text-xl font-bold pr-20 focus:border-primary/50"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">USDC</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {[1, 5, 10, 25].map((v) => (
                            <button key={v} onClick={() => update('amount', String(v))} className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary border border-white/10 transition-colors">{v}</button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white text-sm">Challenge a specific user <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Input
                          value={form.challengedUsername}
                          onChange={(e) => update('challengedUsername', e.target.value.replace('@', ''))}
                          placeholder="@username"
                          className="bg-zinc-900 border-white/10 text-white placeholder:text-muted-foreground focus:border-primary/50"
                        />
                        <p className="text-[10px] text-muted-foreground">Leave blank for an open challenge — anyone can accept.</p>
                      </div>

                      {form.amount && Number(form.amount) >= 0.1 && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-2 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Total pot (you + opponent)</span>
                            <span className="text-white font-medium">${(Number(form.amount) * 2).toFixed(2)} USDC</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Platform fee ({feePercent}%)</span>
                            <span className="text-white">${platformFee} USDC</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-2 font-bold">
                            <span className="text-white">Winner receives</span>
                            <span className="text-primary">${potAfterFee} USDC</span>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* Pool: creator sets their own stake + minimum for participants */}
                  {!isP2P && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-white text-sm">Your Stake (USDC)</Label>
                        <div className="relative">
                          <Input
                            type="number" min="0.1" step="0.1"
                            value={form.amount}
                            onChange={(e) => update('amount', e.target.value)}
                            placeholder="0.00"
                            className="bg-zinc-900 border-white/10 text-white text-xl font-bold pr-20 focus:border-primary/50"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">USDC</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {[1, 5, 10, 25].map((v) => (
                            <button key={v} onClick={() => update('amount', String(v))} className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary border border-white/10 transition-colors">{v}</button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white text-sm">Minimum stake per participant (USDC)</Label>
                        <div className="relative">
                          <Input
                            type="number" min="0.1" step="0.1"
                            value={form.minStake}
                            onChange={(e) => update('minStake', e.target.value)}
                            placeholder="0.10"
                            className="bg-zinc-900 border-white/10 text-white text-lg font-bold pr-20 focus:border-primary/50"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">USDC</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Participants can bet more than this. Winnings are split proportionally to each winner's stake.</p>
                      </div>

                      {form.amount && Number(form.amount) >= 0.1 && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-zinc-900 border border-green-500/20 space-y-2 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Starting pot (your stake)</span>
                            <span className="text-white font-medium">${Number(form.amount).toFixed(2)} USDC</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Platform fee ({feePercent}%)</span>
                            <span className="text-white">${platformFee} USDC</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-2">
                            <span className="text-muted-foreground">Payout split</span>
                            <span className="text-green-400 font-semibold">Proportional to stake</span>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-white text-sm">Expiry</Label>
                    <Select value={form.expiryDays} onValueChange={(v) => update('expiryDays', v)}>
                      <SelectTrigger className="bg-zinc-900 border-white/10 text-white focus:ring-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        {[['1', '24 hours'], ['3', '3 days'], ['7', '1 week'], ['14', '2 weeks'], ['30', '30 days'], ['365', '1 year']].map(([val, label]) => (
                          <SelectItem key={val} value={val} className="focus:bg-white/10">{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* STEP 3 — Review */}
              {step === 3 && (
                <div className="space-y-4">
                  {!connectedWallet && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      Connect your Pera Wallet before creating a wager.
                    </div>
                  )}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="text-white font-medium">{selectedType?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mode</span>
                      <span className={cn('font-bold', isP2P ? 'text-primary' : 'text-green-400')}>
                        {isP2P ? 'Peer to Peer' : 'Pool Betting'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Title</span>
                      <span className="text-white font-medium max-w-[200px] text-right truncate">{form.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolution</span>
                      <span className="text-white font-medium">{RESOLUTION_METHODS.find((m) => m.id === form.resolution)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Your stake</span>
                      <span className="text-primary font-bold">${Number(form.amount).toFixed(2)} USDC</span>
                    </div>
                    {isP2P && form.challengedUsername && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Challenging</span>
                        <span className="text-white font-medium">@{form.challengedUsername}</span>
                      </div>
                    )}
                    {!isP2P && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min stake / participant</span>
                        <span className="text-white font-medium">${Number(form.minStake).toFixed(2)} USDC</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform fee</span>
                      <span className="text-white">{feePercent}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expires in</span>
                      <span className="text-white">{form.expiryDays} days</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    By creating this wager, ${Number(form.amount).toFixed(2)} USDC will be locked in escrow on Algorand. Funds are only released on resolution.
                    The platform fee is taken from the total pot on settlement.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="border-white/10 hover:bg-white/5 text-white gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="flex-1 bg-primary text-black hover:bg-primary/90 font-bold gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !connectedWallet}
              className="flex-1 bg-primary text-black hover:bg-primary/90 font-bold gap-2"
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create Wager'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWagerModal;
