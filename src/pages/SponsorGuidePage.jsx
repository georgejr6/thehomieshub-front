import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, Num } from '@/components/onchain/ui';

// thehomies.app/sponsor/guide — a plain how-to Mwosa can text to supporters
// before they open /sponsor. Same steps as components/onchain/FundStep.jsx;
// keep the two in sync. Coinbase first (Pera's Buy is blocked in New York).

const PERA_IOS = 'https://apps.apple.com/us/app/pera-algo-wallet/id1459898525';
const PERA_ANDROID = 'https://play.google.com/store/apps/details?id=com.algorand.android';

const COINBASE = [
  ['Get the Pera Wallet app', <>Free on <a className="underline" href={PERA_IOS} target="_blank" rel="noopener noreferrer">iPhone</a> or <a className="underline" href={PERA_ANDROID} target="_blank" rel="noopener noreferrer">Android</a>. Create a wallet and write your 25 recovery words down somewhere safe. Never share them with anyone: we will never ask for them.</>],
  ['Get the Coinbase app and verify your ID', 'Usually quick, but the ID check can take a while.'],
  ['On Coinbase, buy about $3 of ALGO plus $1 more USDC than you want to give', 'The extra $1 covers Coinbase’s fee for sending it out. Use a debit card if you can: bank transfers can be held for days before you can send.'],
  ['Send the ALGO to your Pera wallet first', 'Coinbase → Send → ALGO → paste your Pera address (Pera → tap your account → copy address). No memo needed.'],
  ['In Pera, add USDC', 'Tap + / Add asset, search USDC and pick the one with ID 31566704.'],
  ['Send the USDC to Pera on the Algorand network', 'Coinbase → Send → USDC → your same Pera address. When it asks for a network, pick Algorand.'],
  ['Open thehomies.app/sponsor and pay', 'Sign in, connect Pera, pick your amount, approve in Pera. Done.'],
];
const PERA = [
  ['Get the Pera Wallet app', <>Free on <a className="underline" href={PERA_IOS} target="_blank" rel="noopener noreferrer">iPhone</a> or <a className="underline" href={PERA_ANDROID} target="_blank" rel="noopener noreferrer">Android</a>. Create a wallet and save your 25 recovery words. Never share them with anyone.</>],
  ['In Pera, tap Buy and buy ALGO with your card', 'Buy about $3 more than you want to give. First time, it may ask for ID.'],
  ['Tap Swap: ALGO → USDC', 'Swap the amount you want to give. Keep a little ALGO left over.'],
  ['Open thehomies.app/sponsor and pay', 'Sign in, connect Pera, pick your amount, approve in Pera. Done.'],
];

export default function SponsorGuidePage() {
  const [method, setMethod] = useState('coinbase');
  const steps = method === 'coinbase' ? COINBASE : PERA;
  return (
    <div className="min-h-screen bg-[#07070a] text-white">
      <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-6 sm:pt-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff2d55]/40 bg-[#ff2d55]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#ff8099]">
            <Trophy className="h-3.5 w-3.5" /> Fight night · Oct 29
          </div>
          <h1 className="mt-3 font-black uppercase leading-[0.95] tracking-tight" style={{ fontFamily: 'Anton, Impact, "Arial Black", sans-serif', fontSize: 'clamp(2.2rem, 8vw, 3.2rem)' }}>
            How to back Mwosa
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/70">
            You pay in USDC, a digital dollar designed to stay at $1, from your own wallet. It takes a few steps the first time; after that it&apos;s quick.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.06] p-1 text-sm font-semibold" role="group" aria-label="How to get USDC">
          {[['coinbase', 'Coinbase'], ['pera', 'Pera Buy (not NY)']].map(([k, label]) => (
            <button key={k} type="button" aria-pressed={method === k} onClick={() => setMethod(k)}
              className={cn('rounded-lg px-2 py-2.5 transition', method === k ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>
              {label}
            </button>
          ))}
        </div>

        <Card className="mt-4">
          <ol className="space-y-5">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <Num n={i + 1} done={false} />
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="mt-0.5 text-sm text-white/60">{body}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        {method === 'coinbase' && (
          <p className="mt-4 flex gap-2 rounded-xl border border-[#ffee58]/30 bg-[#ffee58]/10 p-3 text-sm text-[#fff59d]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Always pick the Algorand network when sending USDC. Sending it on another network can lose the money.
          </p>
        )}

        <Link to="/sponsor" className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#ff2d55] text-base font-bold text-white hover:bg-[#ff2d55]/90">
          I&apos;m ready: go to the purse <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
        <p className="mt-3 text-center text-xs text-white/40">$1 puts your name on the wall. $10 puts it on his walkout hoodie (while hoodie names are open, until Oct 22).</p>
      </div>
    </div>
  );
}
