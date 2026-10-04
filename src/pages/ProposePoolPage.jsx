import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Gavel, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/onchain/ui';
import { apiError, proposePool } from '@/lib/pools/api';
import { cn } from '@/lib/utils';

// thehomies.app/bets/new — propose a custom pool. The house reviews it in
// /admin/pools and, if approved, creates it on-chain.

const inputCls = 'h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-white outline-none placeholder:text-white/30 focus:border-[#ff2d55]';

export default function ProposePoolPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcomes, setOutcomes] = useState(['', '']);
  const [closeAt, setCloseAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const cleanOutcomes = outcomes.map((o) => o.trim()).filter(Boolean);
  const closeTs = closeAt ? new Date(closeAt).getTime() : 0;

  const problems = [];
  if (title.trim().length < 4) problems.push('Give it a title.');
  if (cleanOutcomes.length < 2) problems.push('Add at least 2 outcomes.');
  if (new Set(cleanOutcomes.map((o) => o.toLowerCase())).size !== cleanOutcomes.length) problems.push('Outcomes must be different.');
  if (!closeTs || closeTs < Date.now() + 60 * 60 * 1000) problems.push('Betting must close at least an hour from now.');
  else if (closeTs > Date.now() + 365 * 24 * 60 * 60 * 1000) problems.push('Betting must close within a year.');
  const valid = problems.length === 0;

  const submit = async () => {
    setError('');
    if (!valid) { setError(problems[0]); return; }
    setBusy(true);
    try {
      await proposePool({
        title: title.trim(),
        description: description.trim(),
        outcomes: cleanOutcomes,
        closeAt: new Date(closeAt).toISOString(),
      });
      setDone(true);
    } catch (err) {
      setError(apiError(err, 'Could not send your proposal'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="mx-auto w-full max-w-xl px-4 pb-20 pt-6 sm:pt-10">
        <Link to="/bets" className="inline-flex items-center gap-1 text-sm font-semibold text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> All pools</Link>
        <h1 className="mt-4 font-black uppercase leading-[0.95] tracking-tight" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif', fontSize: 'clamp(2rem, 8vw, 3rem)' }}>Propose a pool</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Suggest something people can bet on. The Homies team reviews every proposal before it goes live.
        </p>

        {!user ? (
          <Card className="mt-6 text-center">
            <p className="text-white/70">Sign in to propose a pool.</p>
            <Button onClick={() => navigate(`/bets/new?openAuth=1&tab=signin&redirect=/bets/new&t=${Date.now()}`, { replace: true })} className="mt-4 h-11 w-full rounded-xl bg-white font-bold text-black hover:bg-white/90">Sign up or sign in</Button>
          </Card>
        ) : done ? (
          <Card className="mt-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h2 className="mt-3 text-xl font-black">Sent for review</h2>
            <p className="mt-1 text-sm text-white/60">We&apos;ll take a look. If it&apos;s approved it shows up on the pools page.</p>
            <Button onClick={() => navigate('/bets')} className="mt-5 h-11 w-full rounded-xl bg-white font-bold text-black hover:bg-white/90">Back to pools</Button>
          </Card>
        ) : (
          <div className="mt-6 space-y-4">
            <Card className="space-y-3">
              <label className="block text-sm font-semibold text-white/80">Title
                <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Who wins the charity race?" className={cn(inputCls, 'mt-1.5')} />
              </label>
              <label className="block text-sm font-semibold text-white/80">Details (optional)
                <textarea value={description} maxLength={500} rows={3} onChange={(e) => setDescription(e.target.value)} placeholder="What exactly counts as each result?" className="mt-1.5 w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none placeholder:text-white/30 focus:border-[#ff2d55]" />
              </label>
            </Card>

            <Card>
              <div className="text-sm font-semibold text-white/80">Outcomes (2 to 8)</div>
              <div className="mt-2 space-y-2">
                {outcomes.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={o} maxLength={40} onChange={(e) => setOutcomes((os) => os.map((x, n) => (n === i ? e.target.value : x)))} placeholder={`Outcome ${i + 1}`} aria-label={`Outcome ${i + 1}`} className={inputCls} />
                    {outcomes.length > 2 && (
                      <button type="button" aria-label={`Remove outcome ${i + 1}`} onClick={() => setOutcomes((os) => os.filter((_, n) => n !== i))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 text-white/60 hover:bg-white/10"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              {outcomes.length < 8 && (
                <button type="button" onClick={() => setOutcomes((os) => [...os, ''])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-white/70 hover:text-white"><Plus className="h-4 w-4" /> Add outcome</button>
              )}
            </Card>

            <Card>
              <label className="block text-sm font-semibold text-white/80">Betting closes
                <input type="datetime-local" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} className={cn(inputCls, 'mt-1.5 [color-scheme:dark]')} />
              </label>
              <p className="mt-1.5 text-xs text-white/45">Usually the moment the event starts. Your local time.</p>
            </Card>

            <Card>
              <div className="flex items-center gap-2 text-sm font-semibold text-white/80"><Gavel className="h-4 w-4" /> Judges</div>
              <p className="mt-1.5 text-sm text-white/60">Homies assigns neutral judges when approving your bet. They confirm the result from their wallet, and they can&apos;t bet in the pool they judge. If no result is confirmed in time, everyone is refunded.</p>
            </Card>

            {error && <p className="rounded-xl bg-[#ff2d55]/15 p-3 text-center text-sm text-[#ffb3c1]">{error}</p>}
            {!valid && !error && <p className="text-center text-xs text-white/45">{problems[0]}</p>}
            <Button onClick={submit} disabled={busy || !valid} className="h-12 w-full rounded-xl bg-[#ff2d55] text-base font-bold text-white hover:bg-[#ff4d6d] disabled:opacity-40">
              {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null} Send for review
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
