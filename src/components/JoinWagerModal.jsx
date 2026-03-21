import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Wallet, CheckCircle2, Swords, UserCheck, BarChart3, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWager } from '@/contexts/WagerContext';
import { useWallet } from '@/contexts/WalletContext';
import USDInfoBadge from '@/components/USDInfoBadge';
import { useToast } from '@/components/ui/use-toast';

const JoinWagerModal = ({ isOpen, onOpenChange, wager }) => {
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('pick'); // pick | confirm | success
  const [isJoining, setIsJoining] = useState(false);

  const { joinWager } = useWager();
  const { connectedWallet } = useWallet();
  const { toast } = useToast();

  if (!wager) return null;

  const isP2P = wager.bettingMode === 'P2P';
  const feePercent = wager.feePercent ?? 3;
  const minAmount = isP2P ? (wager.stakeAmount ?? 0.1) : (wager.minStake ?? 0.1);
  // P2P: amount is locked to creator's stake. Pool: user chooses freely.
  const effectiveAmount = isP2P ? String(wager.stakeAmount ?? '') : amount;
  const parsedAmount = Number(effectiveAmount);
  const winEstimate = parsedAmount > 0
    ? ((wager.totalPot + parsedAmount) * (1 - feePercent / 100)).toFixed(2)
    : null;

  const handleJoin = async () => {
    if (selectedOutcome === null || parsedAmount < minAmount || !connectedWallet) return;
    // eslint-disable-next-line no-unused-vars
    setIsJoining(true);
    try {
      await joinWager(wager._id, {
        side:   selectedOutcome,
        amount: parsedAmount,
        wager,
      });
      setStep('success');
    } catch (err) {
      toast({ title: 'Failed to join', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = (open) => {
    if (!open) {
      setStep('pick');
      setSelectedOutcome(null);
      setAmount('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Swords className="h-5 w-5 text-primary" />
            Join Wager
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm line-clamp-2">
            {wager.title}
          </DialogDescription>
        </DialogHeader>

        {step === 'success' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white">You're In!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                ${parsedAmount.toFixed(2)} USD locked in Algorand escrow.
              </p>
            </div>
            <Button onClick={() => handleClose(false)} className="bg-primary text-black hover:bg-primary/90 font-bold w-full">
              Done
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-5 py-2">
            {!connectedWallet && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Connect your Pera Wallet to join this wager.
              </div>
            )}

            {/* Outcome selection */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">Pick your side</p>
              {wager.outcomeOptions?.map((option, i) => {
                const pool = wager.pools?.[i];
                const pct = wager.totalPot > 0 && pool ? Math.round((pool.total / wager.totalPot) * 100) : 0;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedOutcome(i)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between',
                      selectedOutcome === i
                        ? 'border-primary bg-primary/10'
                        : 'border-white/10 bg-zinc-900 hover:border-white/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('h-4 w-4 rounded-full border-2 flex items-center justify-center', selectedOutcome === i ? 'border-primary' : 'border-white/30')}>
                        {selectedOutcome === i && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="font-medium text-sm text-white">{option}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-primary font-bold">${(pool?.total || 0).toFixed(2)}</div>
                      <div className="text-[10px] text-muted-foreground">{pct}% of pot</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Amount — P2P fixed vs Pool free */}
            {isP2P ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Your stake</p>
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-primary/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Lock className="h-4 w-4 text-primary" />
                    Fixed — must match creator's stake
                  </div>
                  <USDInfoBadge amount={wager.stakeAmount} size="md" className="text-primary" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  This is a peer-to-peer wager. You must match the creator's exact stake to accept the challenge.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Your stake <span className="text-muted-foreground font-normal text-xs">(min ${minAmount.toFixed(2)})</span></p>
                <div className="relative">
                  <Input
                    type="number"
                    min={minAmount}
                    step="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-zinc-900 border-white/10 text-white text-lg font-bold pr-20 focus:border-primary/50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">USD</span>
                </div>
                <div className="flex gap-2">
                  {[1, 5, 10].map((v) => (
                    <button key={v} onClick={() => setAmount(String(v))} className="flex-1 py-1 text-xs font-medium rounded-lg bg-white/5 hover:bg-primary/10 hover:text-primary border border-white/10 transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Pool bet — stake any amount above the minimum. Winnings paid proportionally to your share of the winning pool.
                </p>
              </div>
            )}

            {/* Payout estimate */}
            {parsedAmount >= minAmount && selectedOutcome !== null && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-zinc-900 border border-primary/20 space-y-1.5 text-xs"
              >
                <div className="flex justify-between text-muted-foreground">
                  <span>New pot total</span>
                  <span className="text-white">${(wager.totalPot + parsedAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform fee ({feePercent}%)</span>
                  <span className="text-white">${((wager.totalPot + parsedAmount) * feePercent / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-white/10 pt-1.5">
                  <span className="text-white">If you win</span>
                  <span className="text-primary text-sm">~${winEstimate} USD</span>
                </div>
              </motion.div>
            )}

            {/* Wallet indicator */}
            {connectedWallet && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3 text-primary" />
                <span className="font-mono">{connectedWallet.address.slice(0, 8)}...{connectedWallet.address.slice(-6)}</span>
              </div>
            )}

            <Button
              onClick={handleJoin}
              disabled={isJoining || selectedOutcome === null || parsedAmount < minAmount || !connectedWallet}
              className="w-full bg-primary text-black hover:bg-primary/90 font-bold h-12"
            >
              {isJoining ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Locking funds...</>
              ) : isP2P ? (
                <><UserCheck className="h-4 w-4 mr-2" /> Accept Challenge — Lock ${parsedAmount.toFixed(2)} USD</>
              ) : (
                `Lock ${parsedAmount >= minAmount ? `$${parsedAmount.toFixed(2)}` : ''} in Pool`
              )}
            </Button>

            <p className="text-[10px] text-muted-foreground text-center">
              Funds are held in Algorand escrow. Released only on resolution.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JoinWagerModal;
