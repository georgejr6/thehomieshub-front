import algosdk from 'algosdk';
import { AlgorandClient } from '@algorandfoundation/algokit-utils/algorand-client';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { ExactAvmScheme } from '@x402/avm/exact/client';

// Pay an x402 endpoint (DIGITVL gateway) from the fan's OWN Algorand wallet
// (Pera / extension wallets via WalletContext). The fan signs a USDC transfer;
// the GoPlausible facilitator co-signs as fee payer and settles it, so it
// counts on the Global x402 Challenge leaderboard. Never pay these from a
// platform wallet: the challenge rules exclude self-payments.

const NETWORK = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=';
const USDC = '31566704';

// x402 hands the wallet raw unsigned transaction bytes plus which of them the
// fan must sign (the fee-payer transaction is the facilitator's). Pera and
// use-wallet both take [{ txn, signers }] groups and return only the signed
// ones, in order.
const toAvmSigner = (address, signTransactions) => ({
  address,
  async signTransactions(txns, indexesToSign) {
    const idx = indexesToSign ?? txns.map((_, i) => i);
    const group = txns.map((bytes, i) => ({
      txn: algosdk.decodeUnsignedTransaction(bytes),
      signers: idx.includes(i) ? [address] : [],
    }));
    const signed = await signTransactions([group]);
    const out = txns.map(() => null);
    idx.forEach((i, k) => { out[i] = signed?.[k] ?? null; });
    return out;
  },
});

export class X402Error extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// -> { body, txId }
export async function payX402(url, { address, signTransactions }) {
  // The default 10-round validity (~28 s) is too short for opening Pera on a
  // phone, approving and coming back; 100 rounds is ~4.7 minutes.
  const algorandClient = AlgorandClient.mainNet().setDefaultValidityWindow(100);
  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: new ExactAvmScheme(toAvmSigner(address, signTransactions), { algorandClient }) }],
    // The default cap is $1 per payment; supporters can send up to $500.
    spendControls: {
      maxAmountPerPayment: '$500',
      allowedAssets: [{ network: NETWORK, asset: USDC, maxAmountPerPayment: '500000000' }],
    },
  });
  const http = new x402HTTPClient(client);

  const first = await fetch(url);
  if (first.status !== 402) {
    const b = await first.json().catch(() => ({}));
    throw new X402Error(b?.error || `Unexpected response (${first.status})`, 'bad_request');
  }
  const required = http.getPaymentRequiredResponse((h) => first.headers.get(h), await first.json().catch(() => undefined));

  let payload;
  try {
    payload = await http.createPaymentPayload(required);
  } catch (err) {
    const msg = String(err?.message || err);
    if (/spendControls/i.test(msg)) throw new X402Error('This amount can’t be paid from this page.', 'limit');
    if (/reject|cancel|closed|denied/i.test(msg)) throw new X402Error('You cancelled in your wallet.', 'cancelled');
    if (/balance|overspend|below min|insufficient/i.test(msg)) throw new X402Error('Not enough USDC in your wallet.', 'funds');
    if (/opt.?in|not opted|asset .* missing/i.test(msg)) throw new X402Error('Your wallet needs USDC added first.', 'optin');
    throw new X402Error(msg, 'sign_failed');
  }

  const res = await fetch(url, { headers: http.encodePaymentSignatureHeader(payload) });
  const body = await res.json().catch(() => null);
  let settle = null;
  try { settle = http.getPaymentSettleResponse((h) => res.headers.get(h)); } catch { /* no header */ }
  if (!res.ok || settle?.success === false) {
    // A verify failure comes back as a fresh 402 whose reason is in PAYMENT-REQUIRED.
    let verifyError = '';
    if (res.status === 402) {
      try { verifyError = http.getPaymentRequiredResponse((h) => res.headers.get(h), body)?.error || ''; } catch { /* none */ }
    }
    const reason = settle?.errorReason || verifyError || body?.error || `Payment failed (${res.status})`;
    if (/balance|overspend|insufficient/i.test(reason)) throw new X402Error('Not enough USDC in your wallet.', 'funds');
    if (/dead|expired|round/i.test(reason)) throw new X402Error('That took too long to approve. Try again.', 'expired');
    throw new X402Error(reason, 'settle_failed');
  }
  return { body, txId: settle?.transaction || null };
}

// USDC + ALGO balance for the funding step.
export async function walletStatus(address) {
  const r = await fetch(`https://mainnet-api.algonode.cloud/v2/accounts/${address}`);
  if (!r.ok) throw new Error('Could not read wallet');
  const a = await r.json();
  const usdc = (a.assets || []).find((x) => x['asset-id'] === Number(USDC));
  return {
    algo: (a.amount || 0) / 1e6,
    optedIn: !!usdc,
    usdc: usdc ? usdc.amount / 1e6 : 0,
  };
}
