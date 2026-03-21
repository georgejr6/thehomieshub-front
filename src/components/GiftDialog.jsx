import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Diamond, Gift } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import api from "@/api/homieshub";

const GIFT_AMOUNTS = [10, 50, 100, 500, 1000];

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
  recipientId,       // toUserId — _id of recipient
  recipientName,
  recipientUsername,
  targetType = 'video', // 'video' | 'reel' | 'community_post' | 'live_stream'
  targetId,          // _id of the content being gifted on
  onGiftSuccess,
}) => {
  const [balance, setBalance] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [particles, setParticles] = useState([]);
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

  // Clean up particles on close
  useEffect(() => {
    if (!isOpen) {
      setParticles([]);
      setSelectedAmount(null);
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
      toast({
        title: "Not enough points",
        description: "Purchase more points in your wallet.",
        variant: 'destructive',
      });
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
      });

      // Deduct optimistically
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Gift className="w-6 h-6 text-primary" />
            Send Gift to {recipientName}
          </DialogTitle>
          <DialogDescription>Support this creator by sending points.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-6 relative">
          {/* Floating particles on success */}
          {particles.map((p) => (
            <FloatingParticle key={p.id} x={p.x} delay={p.delay} />
          ))}

          {GIFT_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              className={cn(
                "flex flex-col h-24 gap-2 border-2 transition-all hover:border-primary/50",
                selectedAmount === amount
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  : "border-muted bg-card hover:bg-accent"
              )}
              onClick={() => setSelectedAmount(amount)}
            >
              <Diamond className={cn("w-8 h-8", selectedAmount === amount ? 'fill-primary text-primary' : 'text-muted-foreground')} />
              <span className="font-bold text-lg">{amount}</span>
            </Button>
          ))}
        </div>

        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg mb-2 border border-border/50">
          <span className="text-sm text-muted-foreground">Your Balance:</span>
          <span className="font-bold flex items-center gap-1 text-primary">
            {Number(balance || 0).toLocaleString()} <Diamond className="w-3 h-3 fill-current" />
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSendGift}
            disabled={!selectedAmount || isSending || balance < (selectedAmount || 0)}
            className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white border-0"
          >
            {isSending ? "Sending..." : selectedAmount ? `Send ${selectedAmount} pts` : "Send Gift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GiftDialog;
