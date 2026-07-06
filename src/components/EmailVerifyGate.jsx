import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Loader2, LogOut } from 'lucide-react';

// App-wide gate: a logged-in PASSWORD (local) account must confirm its email
// before using the app. OAuth accounts (Discord/Google/Apple) are provider-
// verified, so this never shows for them. Closes the "signed up unverified" hole.
export default function EmailVerifyGate() {
  const { user, refreshMe, signOut } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || user.emailVerified || user.createdVia !== 'local') return null;

  const resend = async () => {
    setBusy(true);
    try {
      await api.post('/auth/verify-email/send', {});
      toast({ title: 'Code sent', description: `Check ${user.email}` });
    } catch (err) {
      const c = err.response?.status;
      toast({ title: c === 429 ? 'Code already sent' : 'Could not send', description: err.response?.data?.message || 'Check your email.', variant: c === 429 ? 'default' : 'destructive' });
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (!/^\d{6}$/.test(code.trim())) { toast({ title: 'Enter the 6-digit code', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      await api.post('/auth/verify-email/confirm', { code: code.trim() });
      toast({ title: 'Email verified ✓' });
      await refreshMe();
    } catch (err) {
      toast({ title: 'Invalid code', description: err.response?.data?.message || 'Check the code and try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[900] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">Confirm your email</h1>
        <p className="text-muted-foreground text-sm mt-2 mb-6">
          Enter the 6-digit code we emailed to <span className="text-foreground">{user.email}</span> to finish setting up your account.
        </p>
        <div className="space-y-3">
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="6-digit code"
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-center tracking-[0.4em] text-lg text-foreground placeholder:tracking-normal placeholder:text-white/30 outline-none focus:border-primary/60"
          />
          <Button size="lg" onClick={confirm} disabled={busy} className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirm & continue
          </Button>
          <button onClick={resend} disabled={busy} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">Resend code</button>
        </div>
        <button onClick={signOut} className="mt-6 text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mx-auto">
          <LogOut className="w-3 h-3" /> Sign out
        </button>
      </div>
    </div>
  );
}
