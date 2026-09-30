import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Diamond, Gift, ShoppingCart, ArrowLeft, Loader2, Volume2, CreditCard } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import api from "@/api/homieshub";

// Stream card donations (backend utils/live/streamDonation.js).
const CARD_MIN_CENTS = 100;
const CARD_MAX_CENTS = 50000;

const GIFT_AMOUNTS = [10, 50, 100, 500, 1000];

const POINT_PACKS = [
  { pack: "small",  points: 100,  price: "$0.99" },
  { pack: "medium", points: 550,  price: "$4.99", recommended: true },
  { pack: "large",  points: 1200, price: "$9.99" },
];

// Floating diamond particle
const FloatingParticle = ({ x, delay }) => (
  <div
    className="pointer-events-none absolute bottom-0 animate-gift-float"
    style={{ left: `${x}%`, animationDelay: `${delay}ms` }}
  >
    <Diamond className="w-5 h-5 text-primary fill-primary opacity-90" />
  </div>
);

const GiftDialog = ({
  isOpen,
  onOpenChange,
  recipientId,
  recipientName,
  recipientUsername,
  targetType = 'video',
  targetId,
  onGiftSuccess,
}) => {
  const [balance, setBalance] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [ttsMessage, setTtsMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [particles, setParticles] = useState([]);
  const [showBuyPoints, setShowBuyPoints] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // pack key being loaded
  const { user } = useAuth();
  const { toast } = useToast();
  const particleTimer = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const resp = await api.get("/wallet/me");
        setBalance(resp?.data?.result?.walletPoints ?? 0);
      } catch (e) {
        setBalance(0);
      }
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setParticles([]);
      setSelectedAmount(null);
      setTtsMessage('');
      setShowBuyPoints(false);
      setCheckoutLoading(null);
      setCardDonating(false);
      clearTimeout(particleTimer.current);
    }
  }, [isOpen]);

  const triggerParticles = () => {
    const burst = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 10 + Math.random() * 80,
      delay: i * 80,
    }));
    setParticles(burst);
    particleTimer.current = setTimeout(() => setParticles([]), 1500);
  };

  const handleSendGift = async () => {
    if (!selectedAmount || isSending) return;

    if (user?.username && recipientUsername && user.username === recipientUsername) {
      toast({ title: "Can't gift yourself", variant: 'destructive' });
      return;
    }
    if (balance < selectedAmount) {
      setShowBuyPoints(true);
      return;
    }

    if (!recipientId || !targetId) {
      toast({ title: "Gift target missing", description: "Can't send gift — missing recipient or content info.", variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      await api.post("/user/gift", {
        toUserId: recipientId,
        targetType,
        targetId,
        points: selectedAmount,
        ttsMessage: ttsMessage.trim() || undefined,
      });

      setBalance((b) => Math.max(0, b - selectedAmount));
      triggerParticles();

      toast({
        title: "Gift Sent!",
        description: `You sent ${selectedAmount} pts to ${recipientName}.`,
      });

      setTimeout(() => {
        onOpenChange(false);
        setSelectedAmount(null);
        if (onGiftSuccess) onGiftSuccess(selectedAmount);
      }, 900);
    } catch (err) {
      toast({
        title: "Gift failed",
        description: err?.response?.data?.message || "Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleBuyPoints = async (packKey) => {
    if (!user) {
      toast({ title: "Login required", variant: "destructive" });
      return;
    }
    setCheckoutLoading(packKey);
    try {
      const resp = await api.post("/wallet/credits/checkout", { pack: packKey });
      const url = resp?.data?.result?.url;
      if (!url) throw new Error("Missing checkout URL");
      window.location.href = url;
    } catch (e) {
      toast({
        title: "Checkout failed",
        description: e?.response?.data?.message || e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const [cardDonating, setCardDonating] = useState(false);
  const [cardDollars, setCardDollars] = useState('5');
  const needsTopUp = selectedAmount !== null && balance < selectedAmount;

  const handleCardDonate = async () => {
    if (!targetId || targetType !== 'live_stream') {
      window.open('https://donate.stripe.com/fZu9ASbadcfU5VzbX4f7i09', '_blank');
      return;
    }
    // Live streams: our own Stripe Checkout. The message is read aloud only
    // after Stripe confirms the payment (backend webhook), never before.
    if (!user) {
      toast({ title: "Login required", description: "Sign in to donate to this stream.", variant: "destructive" });
      return;
    }
    const amountCents = Math.round(Number(cardDollars) * 100);
    if (!Number.isFinite(amountCents) || amountCents < CARD_MIN_CENTS || amountCents > CARD_MAX_CENTS) {
      toast({ title: "Pick an amount", description: `Donations are $${CARD_MIN_CENTS / 100}–$${CARD_MAX_CENTS / 100}.`, variant: "destructive" });
      return;
    }
    setCardDonating(true);
    try {
      const { data } = await api.post(`/live/${targetId}/card-donation/checkout`, { amountCents, ttsMessage: ttsMessage.trim() || undefined });
      const url = data?.result?.url;
      if (!url) throw new Error('Missing checkout URL');
      window.location.href = url;
    } catch (e) {
      setCardDonating(false);
      toast({ title: "Couldn't start checkout", description: e?.response?.data?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground overflow-hidden">

        {showBuyPoints ? (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowBuyPoints(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  Buy Points
                </DialogTitle>
              </div>
              <DialogDescription className="pl-10">Get points to send gifts to your favorite creators.</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {POINT_PACKS.map((pkg) => (
                <button
                  key={pkg.pack}
                  disabled={checkoutLoading !== null}
                  onClick={() => handleBuyPoints(pkg.pack)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                    pkg.recommended
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Diamond className={cn("w-7 h-7", pkg.recommended ? "fill-primary text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="font-bold text-base">{pkg.points.toLocaleString()} pts</p>
                      {pkg.recommended && <span className="text-xs text-primary font-medium">Best Value</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base">{pkg.price}</span>
                    {checkoutLoading === pkg.pack
                      ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      : null
                    }
                  </div>
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-muted-foreground pb-1">
              Secure checkout via Stripe. Points are added instantly after payment.
            </p>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Gift className="w-6 h-6 text-primary" />
                Send Gift to {recipientName}
              </DialogTitle>
              <DialogDescription>Support this creator by sending points.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3 py-4 relative">
              {particles.map((p) => (
                <FloatingParticle key={p.id} x={p.x} delay={p.delay} />
              ))}

              {GIFT_AMOUNTS.map((amount) => {
                const cantAfford = balance < amount;
                return (
                  <Button
                    key={amount}
                    variant="outline"
                    className={cn(
                      "flex flex-col h-24 gap-2 border-2 transition-all",
                      selectedAmount === amount
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : cantAfford
                          ? "border-muted bg-muted/20 text-muted-foreground/50 hover:border-muted"
                          : "border-muted bg-card hover:border-primary/50 hover:bg-accent"
                    )}
                    onClick={() => setSelectedAmount(amount)}
                  >
                    <Diamond className={cn("w-8 h-8",
                      selectedAmount === amount ? 'fill-primary text-primary'
                      : cantAfford ? 'text-muted-foreground/30'
                      : 'text-muted-foreground'
                    )} />
                    <span className="font-bold text-lg">{amount}</span>
                  </Button>
                );
              })}
            </div>

            {/* TTS message — only on live stream gifts */}
            {targetType === 'live_stream' && (
              <div className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  Message to read aloud <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  value={ttsMessage}
                  onChange={(e) => setTtsMessage(e.target.value)}
                  placeholder="Say something to the streamer..."
                  maxLength={150}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Your message will be read out loud in the stream when your gift is received.</p>
              </div>
            )}

            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border/50">
              <span className="text-sm text-muted-foreground">Your Balance:</span>
              <div className="flex items-center gap-2">
                <span className={cn("font-bold flex items-center gap-1", needsTopUp ? "text-red-400" : "text-primary")}>
                  {Number(balance || 0).toLocaleString()} <Diamond className="w-3 h-3 fill-current" />
                </span>
                <button
                  onClick={() => setShowBuyPoints(true)}
                  className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                >
                  + Buy
                </button>
              </div>
            </div>

            {needsTopUp && (
              <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <span className="text-sm text-red-400">Not enough points for this gift</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-400 text-red-400 hover:bg-red-500/20 h-7 text-xs"
                  onClick={() => setShowBuyPoints(true)}
                >
                  Buy Points
                </Button>
              </div>
            )}

            {/* Donate with Card — only on live streams */}
            {targetType === 'live_stream' && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
                <p className="text-xs font-semibold text-green-400 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Donate with Card
                </p>
                <p className="text-xs text-muted-foreground">Skip the points — donate directly via Stripe. Your message is read aloud in the stream once the payment goes through.</p>
                <div className="flex flex-wrap items-center gap-2">
                  {[2, 5, 10, 20].map((d) => (
                    <button key={d} type="button" onClick={() => setCardDollars(String(d))}
                      className={cn("rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors",
                        Number(cardDollars) === d ? "border-green-500 bg-green-500/15 text-green-400" : "border-border hover:border-green-500/50")}>
                      ${d}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input type="number" inputMode="decimal" min={CARD_MIN_CENTS / 100} max={CARD_MAX_CENTS / 100} step="1"
                      aria-label="Donation amount in dollars" value={cardDollars} onChange={(e) => setCardDollars(e.target.value)}
                      className="h-8 w-20 text-sm" />
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleCardDonate}
                  disabled={cardDonating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white border-0 h-10"
                >
                  {cardDonating ? <Loader2 className="h-4 w-4 animate-spin" /> : `💳 Donate $${Number(cardDollars) > 0 ? Number(cardDollars) : '…'} with Card`}
                </Button>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSendGift}
                disabled={!selectedAmount || isSending}
                className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white border-0"
              >
                {isSending ? "Sending..." : needsTopUp ? "Buy Points to Send" : selectedAmount ? `Send ${selectedAmount} pts` : "Send Gift"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GiftDialog;
