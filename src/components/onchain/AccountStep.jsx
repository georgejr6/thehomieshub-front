import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from './ui';

// "Your Homies account" sign-in step shared by /sponsor and /fight.
export default function AccountStep({ user, onSignIn, body }) {
  return (
    <Card className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff2d55]/15"><Sparkles className="h-7 w-7 text-[#ff2d55]" /></div>
      <h2 className="mt-4 text-2xl font-black">Your Homies account</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
      {user ? (
        <p className="mt-5 inline-flex items-center gap-2 font-semibold text-emerald-400"><CheckCircle2 className="h-5 w-5" /> Signed in as @{user.username}</p>
      ) : (
        <Button onClick={onSignIn} className="mt-6 h-12 w-full rounded-xl bg-white text-base font-bold text-black hover:bg-white/90">Sign up or sign in</Button>
      )}
    </Card>
  );
}
