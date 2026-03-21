import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, HelpCircle, ExternalLink, Download, ChevronDown, ChevronUp, Smartphone } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import CryptoOnboardingModal from '@/components/CryptoOnboardingModal';

// Extension wallet install info
const EXTENSION_INFO = {
  lute:    { installLabel: 'Install Lute',    installUrl: 'https://lute.app',    errorHint: 'Install the Lute browser extension, then refresh and try again.' },
  exodus:  { installLabel: 'Install Exodus',  installUrl: 'https://exodus.com',  errorHint: 'Install Exodus and enable the browser extension, then try again.' },
  kibisis: { installLabel: 'Install Kibisis', installUrl: 'https://kibis.is',    errorHint: 'Install the Kibisis browser extension, then refresh and try again.' },
};

const WalletConnectModal = ({ isOpen, onOpenChange }) => {
  const { wallets, peraWallet, connectWallet, connectedWallet, disconnectWallet } = useWallet();
  const { toast } = useToast();

  const [connecting, setConnecting]           = useState(null);
  const [connected, setConnected]             = useState(null);
  const [walletError, setWalletError]         = useState(null);
  const [showExtensions, setShowExtensions]   = useState(false);
  const [onboardingOpen, setOnboardingOpen]   = useState(false);
  const [peraDeepLink, setPeraDeepLink]       = useState(null);
  const deepLinkPollRef                       = useRef(null);

  // When Pera connection is in progress, poll for the WC URI that connect-beta
  // injects into <pera-wallet-connect-modal uri="wc:..."> so we can show an
  // "Open Pera Wallet" deep-link for same-device iOS users.
  useEffect(() => {
    if (connecting !== 'pera') {
      clearInterval(deepLinkPollRef.current);
      setPeraDeepLink(null);
      return;
    }
    deepLinkPollRef.current = setInterval(() => {
      const modal = document.querySelector('pera-wallet-connect-modal');
      const uri   = modal?.getAttribute('uri');
      if (uri) {
        setPeraDeepLink(`perawallet://wc?uri=${encodeURIComponent(uri)}`);
        clearInterval(deepLinkPollRef.current);
      }
    }, 150);
    return () => clearInterval(deepLinkPollRef.current);
  }, [connecting]);

  // Extension wallets only (Pera is handled via peraWallet directly)
  const extensionWallets = wallets.filter(w => w.id !== 'walletconnect');

  const handleConnectPera = async () => {
    setConnecting('pera');
    setWalletError(null);
    try {
      await connectWallet('pera');
      setConnected('pera');
      toast({ title: 'Wallet Connected', description: 'Connected to Pera Wallet' });
      setTimeout(() => {
        onOpenChange(false);
        setConnected(null);
        setConnecting(null);
      }, 1400);
    } catch (err) {
      setConnecting(null);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('closed')) return;
      console.error('[Pera] connect error:', err);
      setWalletError({
        id:   'pera',
        name: 'Pera Wallet',
        hint: `Connection failed${msg ? `: ${msg}` : ''}. Make sure Pera Wallet is installed and try again.`,
      });
    }
  };

  const handleConnectExtension = async (wallet) => {
    setConnecting(wallet.id);
    setWalletError(null);
    try {
      await wallet.connect();
      wallet.setActive();
      setConnected(wallet.id);
      toast({ title: 'Wallet Connected', description: `Connected to ${wallet.metadata.name}` });
      setTimeout(() => {
        onOpenChange(false);
        setConnected(null);
        setConnecting(null);
      }, 1400);
    } catch (err) {
      setConnecting(null);
      const msg = err?.message || '';
      if (msg.includes('cancelled') || msg.includes('rejected') || msg.includes('closed') || msg.includes('denied')) return;
      const info = EXTENSION_INFO[wallet.id] || {};
      setWalletError({
        id:           wallet.id,
        name:         wallet.metadata.name,
        hint:         info.errorHint || 'Something went wrong. Please try again.',
        installUrl:   info.installUrl,
        installLabel: info.installLabel,
      });
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    toast({ title: 'Wallet Disconnected' });
    onOpenChange(false);
  };

  const handleClose = (open) => {
    if (!open) { setConnecting(null); setConnected(null); setWalletError(null); setShowExtensions(false); }
    onOpenChange(open);
  };

  const isPeraLoading = connecting === 'pera';
  const isPeraDone    = connected  === 'pera';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">
              {connectedWallet ? 'Wallet Connected' : 'Connect Your Wallet'}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-sm">
              {connectedWallet ? `Connected via ${connectedWallet.type}` : 'Use your phone — no browser extension needed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">

            {/* ── Already connected ── */}
            {connectedWallet ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">{connectedWallet.type}</p>
                    <p className="font-mono text-sm text-primary">{connectedWallet.address.slice(0, 10)}...{connectedWallet.address.slice(-6)}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                </div>
                <Button variant="destructive" className="w-full" onClick={handleDisconnect}>
                  Disconnect Wallet
                </Button>
              </div>

            ) : (
              <>
                {/* ── Step 1: Get Pera ── */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">1</span>
                    </div>
                    <p className="text-sm font-semibold text-white">Don't have a wallet yet?</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                    Download <span className="text-white font-medium">Pera Wallet</span> — the easiest Algorand wallet for your phone. Free, takes 2 minutes.
                  </p>
                  <div className="flex gap-2 pl-7">
                    <a
                      href="https://apps.apple.com/us/app/pera-algo-wallet/id1459898525"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> App Store
                    </a>
                    <a
                      href="https://play.google.com/store/apps/details?id=com.algorand.android"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Google Play
                    </a>
                  </div>
                </div>

                {/* ── Step 2: Connect via Pera SDK ── */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">2</span>
                    </div>
                    <p className="text-sm font-semibold text-white">Connect with your phone</p>
                  </div>

                  <button
                    onClick={handleConnectPera}
                    disabled={!!connecting}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src="https://perawallet.app/assets/favicon/apple-icon.png"
                          alt="Pera"
                          className="h-8 w-8 object-contain"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">Connect with Pera</p>
                        <p className="text-[10px] text-muted-foreground">Scan QR or tap to open Pera Wallet</p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {isPeraLoading ? <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        : isPeraDone  ? <CheckCircle2 className="h-5 w-5 text-green-400" />
                        : <div className="h-8 px-3 rounded-lg bg-primary text-black text-xs font-bold flex items-center">Connect</div>
                      }
                    </div>
                  </button>

                  {/* Mobile same-device deep link — appears once the Pera modal has injected its URI */}
                  {peraDeepLink && (
                    <a
                      href={peraDeepLink}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-sm font-semibold text-primary transition-colors"
                    >
                      <Smartphone className="h-4 w-4" />
                      Open Pera Wallet on this device
                    </a>
                  )}
                </div>

                {/* ── Error feedback ── */}
                {walletError && (
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20 space-y-1.5">
                    <p className="text-xs font-semibold text-red-400">{walletError.name} — Connection failed</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{walletError.hint}</p>
                    {walletError.installUrl && (
                      <a href={walletError.installUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                        <Download className="h-3.5 w-3.5" />
                        {walletError.installLabel}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* ── Desktop extension wallets (collapsed by default) ── */}
                {extensionWallets.length > 0 && (
                  <div className="border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowExtensions(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <span>Already have a desktop wallet? (Lute, Exodus, Kibisis)</span>
                      {showExtensions ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showExtensions && (
                      <div className="border-t border-white/10 p-2 space-y-1.5 bg-zinc-900/50">
                        {extensionWallets.map((wallet) => {
                          const info      = EXTENSION_INFO[wallet.id] || {};
                          const isLoading = connecting === wallet.id;
                          const isDone    = connected  === wallet.id;
                          const hasError  = walletError?.id === wallet.id;
                          return (
                            <button
                              key={wallet.id}
                              onClick={() => handleConnectExtension(wallet)}
                              disabled={!!connecting}
                              className={cn(
                                'group w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left',
                                hasError ? 'bg-red-500/5 border-red-500/30' : 'bg-zinc-900 border-white/10 hover:border-white/30',
                                'disabled:opacity-60 disabled:cursor-not-allowed'
                              )}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                                  {wallet.metadata.icon
                                    ? <img src={wallet.metadata.icon} alt={wallet.metadata.name} className="h-6 w-6 object-contain" />
                                    : <div className="h-6 w-6 rounded bg-zinc-200" />
                                  }
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-white">{wallet.metadata.name}</p>
                                  {info.installLabel && (
                                    <a href={info.installUrl} target="_blank" rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="text-[10px] text-primary/60 hover:text-primary transition-colors flex items-center gap-0.5">
                                      {info.installLabel} <ExternalLink className="h-2.5 w-2.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0">
                                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                  : isDone  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                  : hasError ? <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                  : <span className="text-[10px] text-muted-foreground">Connect</span>
                                }
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Footer ── */}
                <div className="flex flex-col items-center gap-2 pt-1">
                  <button
                    onClick={() => { handleClose(false); setOnboardingOpen(true); }}
                    className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    New to crypto? Step-by-step guide
                  </button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CryptoOnboardingModal
        isOpen={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onConnectWallet={() => { setOnboardingOpen(false); onOpenChange(true); }}
      />
    </>
  );
};

export default WalletConnectModal;
