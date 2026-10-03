import React from 'react';
import { CheckCircle2, Loader2, Smartphone, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Num } from './ui';

const PERA_IOS = 'https://apps.apple.com/us/app/pera-algo-wallet/id1459898525';
const PERA_ANDROID = 'https://play.google.com/store/apps/details?id=com.algorand.android';

// "Get your wallet" step shared by /sponsor and /fight (Pera download → create → connect).
export default function WalletStep({ connectedWallet, isConnecting, onConnect }) {
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff2d55]/15"><Wallet className="h-6 w-6 text-[#ff2d55]" /></div>
          <div>
            <h2 className="text-xl font-black">Get your wallet</h2>
            <p className="text-sm text-white/60">Pera is a free app that holds your digital dollars.</p>
          </div>
        </div>
        <ol className="mt-5 space-y-4">
          <li className="flex gap-3">
            <Num n={1} done={!!connectedWallet} />
            <div className="flex-1">
              <div className="font-semibold">Download Pera Wallet</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={PERA_IOS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"><Smartphone className="h-4 w-4" /> iPhone</a>
                <a href={PERA_ANDROID} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"><Smartphone className="h-4 w-4" /> Android</a>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <Num n={2} done={!!connectedWallet} />
            <div>
              <div className="font-semibold">Create a wallet</div>
              <div className="text-sm text-white/60">Tap “Create a new wallet”. Write your 25 recovery words on paper and keep them safe — nobody, including us, can recover them for you.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <Num n={3} done={!!connectedWallet} />
            <div className="flex-1">
              <div className="font-semibold">Connect it here</div>
              {connectedWallet ? (
                <div className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Connected {connectedWallet.address.slice(0, 6)}…{connectedWallet.address.slice(-4)}</div>
              ) : (
                <Button onClick={onConnect} disabled={isConnecting} className="mt-2 h-11 w-full rounded-xl bg-[#ffee58] font-bold text-black hover:bg-[#fff176]">
                  {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Connect Pera Wallet
                </Button>
              )}
            </div>
          </li>
        </ol>
      </Card>
      <p className="px-1 text-center text-xs text-white/40">Already use Pera? Just tap Connect.</p>
    </div>
  );
}
