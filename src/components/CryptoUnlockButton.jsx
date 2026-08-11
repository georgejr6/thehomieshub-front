import React, { useState } from 'react';
import algosdk from 'algosdk';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, ExternalLink } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/components/ui/use-toast';
import { algodClient, buildWagerPaymentTxn, getUSDCBalance } from '@/lib/algorand';
import api from '@/api/homieshub';

// Transak onramp so a buyer with no crypto can buy USDC on Algorand.
const TRANSAK_KEY = import.meta.env.VITE_TRANSAK_API_KEY || '';
const TRANSAK_BASE = import.meta.env.VITE_TRANSAK_ENV === 'production'
  ? 'https://global.transak.com'
  : 'https://global-stg.transak.com';

const transakUrl = ({ address, amountUsd }) => {
  const p = new URLSearchParams({
    network: 'algorand',
    cryptoCurrencyCode: 'USDC',
    fiatCurrency: 'USD',
  });
  if (TRANSAK_KEY) p.set('apiKey', TRANSAK_KEY);
  if (address) p.set('walletAddress', address);
  if (amountUsd) p.set('defaultCryptoAmount', String(amountUsd));
  return `${TRANSAK_BASE}?${p.toString()}`;
};

// Pay for a marketplace product in USDC on Algorand. Buyer signs a USDC transfer
// to the platform wallet with Pera; the backend verifies it on-chain, unlocks
// the content, and forwards the seller's cut. onSuccess() fires when unlocked.
const CryptoUnlockButton = ({ productId, priceCents, onSuccess, className }) => {
  const { connectedWallet, connectWallet, signTransactions } = useWallet();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    setBusy(true);
    try {
      // 1) Ensure a wallet is connected.
      let address = connectedWallet?.address;
      if (!address) {
        toast({ title: 'Connect your wallet', description: 'Approve the connection in Pera.' });
        const res = await connectWallet('pera');
        address = res?.address;
      }
      if (!address) { setBusy(false); return; }

      // 2) Get the exact amount + destination from the backend.
      const { data: q } = await api.get(`/marketplace/crypto/quote/${productId}`);
      const quote = q?.result;
      if (!quote?.payTo || !quote?.amountUsd) throw new Error('Could not get a price quote.');

      // Safety: src/lib/algorand.js is pinned to TESTNET (asset id + node). If the
      // backend has moved to mainnet, block rather than sign the wrong asset on
      // the wrong network. Update src/lib/algorand.js before enabling mainnet.
      if (quote.network && quote.network !== 'testnet') {
        toast({ title: 'Crypto checkout unavailable', description: 'Card checkout still works — crypto is being finalized.', variant: 'destructive' });
        setBusy(false);
        return;
      }

      // 3) Make sure they actually hold enough USDC — otherwise route to onramp.
      const bal = await getUSDCBalance(address);
      if (bal !== null && bal < quote.amountUsd) {
        toast({
          title: 'Not enough USDC',
          description: `You need ${quote.amountUsd} USDC. Opening Transak to top up…`,
        });
        window.open(transakUrl({ address, amountUsd: quote.amountUsd }), '_blank', 'noopener');
        setBusy(false);
        return;
      }

      // 4) Build + sign + submit the USDC transfer to the platform wallet.
      toast({ title: 'Approve payment', description: 'Sign the USDC payment in Pera.' });
      const txn = await buildWagerPaymentTxn({
        senderAddress: address,
        escrowAddress: quote.payTo,
        amountUSDC: quote.amountUsd,
        note: `buy:${productId}`,
      });
      const [[signed]] = await signTransactions([[{ txn, signers: [address] }]]);
      const { txId } = await algodClient.sendRawTransaction(signed).do();
      await algosdk.waitForConfirmation(algodClient, txId, 6);

      // 5) Confirm with the backend (verifies on-chain, unlocks, pays seller).
      toast({ title: 'Confirming…', description: 'Unlocking your purchase.' });
      await api.post('/marketplace/crypto/confirm', { productId, txId });

      toast({ title: 'Unlocked 🎉', description: 'Paid in USDC. Enjoy!' });
      onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Payment failed.';
      toast({ title: 'Crypto payment failed', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openOnramp = () => {
    window.open(transakUrl({ address: connectedWallet?.address, amountUsd: (priceCents || 0) / 100 }), '_blank', 'noopener');
  };

  return (
    <div className={className}>
      <Button variant="outline" className="w-full gap-2" onClick={pay} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
        Pay with USDC (crypto)
      </Button>
      <button type="button" onClick={openOnramp} className="mt-1.5 w-full text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1">
        No crypto? Buy USDC with card <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
};

export default CryptoUnlockButton;
