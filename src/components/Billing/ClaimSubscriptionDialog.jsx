import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Reusable "connect / verify your membership" flow.
 *
 * A member may have paid Stripe with one email but signed up here with another,
 * so their plan won't show automatically. This dialog looks up the Stripe
 * customer by the email they PAID with, emails a 6-digit code to that address,
 * and on verify links the subscription to the current account (backend
 * /subscription/claim + /claim/verify).
 *
 * Controlled via `open` / `onOpenChange` so it can be opened from the billing
 * page, the global connect banner, or anywhere else.
 */
export default function ClaimSubscriptionDialog({ open, onOpenChange }) {
  const { toast } = useToast();
  const { refreshMe } = useAuth();

  const [step, setStep] = useState('email'); // 'email' | 'code' | 'done'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep('email');
    setEmail('');
    setToken('');
    setCode('');
  };

  const handleOpenChange = (o) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const sendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/subscription/claim', { email: email.trim() });
      setToken(data.result.token);
      setStep('code');
      toast({ title: 'Code sent!', description: `Check ${email} for your 6-digit code.` });
    } catch (err) {
      toast({
        title: 'Not found',
        description: err.response?.data?.message || 'No active subscription found for that email.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await api.post('/subscription/claim/verify', { token, code: code.trim() });
      setStep('done');
      await refreshMe().catch(() => {});
      toast({ title: 'Membership linked!', description: 'Your plan is now connected to this account.' });
    } catch (err) {
      toast({
        title: 'Invalid code',
        description: err.response?.data?.message || 'Incorrect or expired code.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Your Membership</DialogTitle>
          <DialogDescription>
            {step === 'email' && 'Enter the email address you used when you paid on Stripe — even if it’s different from your login email.'}
            {step === 'code' && `We sent a 6-digit code to ${email}. Enter it below to confirm it’s you.`}
            {step === 'done' && 'Your membership has been connected to this account!'}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <div className="space-y-3 pt-1">
            <Input
              type="email"
              placeholder="email-you-paid-with@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendCode()}
              autoFocus
            />
            <Button className="w-full" onClick={sendCode} disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send Code
            </Button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-3 pt-1">
            <Input
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && verify()}
              maxLength={6}
              autoFocus
            />
            <Button className="w-full" onClick={verify} disabled={loading || code.length !== 6}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify & Connect
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setStep('email')}>
              Use a different email
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="pt-2 space-y-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-sm text-muted-foreground">You’re all set. Your access will reflect your plan right away.</p>
            <Button className="w-full" onClick={() => handleOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
