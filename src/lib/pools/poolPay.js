import algosdk from 'algosdk';
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { X402Error } from '@/lib/x402Pay';
import { USDC_ASA, abiMethod, appAddress, betBoxName, poolBoxName, suggestedParams } from './chain';

// Place a pool bet through the DIGITVL x402 gateway (GET /bet), from the fan's
// OWN wallet, so it settles through the x402 facilitator like /support does.
//
// The stock @x402/avm client builds [fee-payer, axfer]. A bet needs the
// contract call too, so this file is a small x402 scheme client that builds:
//
//   [0] pay   facilitator → facilitator, 0 ALGO, fee = whole group  (unsigned; facilitator signs)
//   [1] axfer bettor → pool app address, amount USDC                 (paymentIndex = 1)
//   [2] appl  bettor → app, bet(axfer, pool_id, outcome), boxes p+id, b+id+bettor
//
// The wallet signs only [1] and [2]. Everything else (402 parsing, header
// encoding, settle response) is @x402/core, exactly like x402Pay.js. The
// facilitator (node_modules/@x402/avm exact/facilitator) accepts extra signed
// non-facilitator txns in the group, checks the axfer at paymentIndex, signs
// its fee payer (fee cap 5000 µALGO × group size) and simulates the group.

const NETWORK = 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=';

const b64 = (bytes) => algosdk.bytesToBase64(bytes);

export class PoolBetScheme {
  constructor({ address, signTransactions, poolId, outcome, amountMicro, appId }) {
    this.scheme = 'exact';
    this.address = address;
    this.signTransactions = signTransactions;
    this.expect = { poolId: BigInt(poolId), outcome: Number(outcome), amountMicro: BigInt(amountMicro), appId: appId ? BigInt(appId) : null };
  }

  findDefaultAsset(asset) {
    return String(asset) === String(USDC_ASA) ? { asset: String(USDC_ASA), decimals: 6, symbol: 'USDC' } : undefined;
  }

  async createPaymentPayload(x402Version, req) {
    const extra = req.extra || {};
    const appId = BigInt(extra.appId ?? 0);
    const poolId = BigInt(extra.poolId ?? -1);
    const outcome = Number(extra.outcome);
    const amount = BigInt(req.amount);

    // Never sign something other than what the fan picked on the page.
    if (!appId) throw new X402Error('Betting isn’t open yet.', 'bad_request');
    if (this.expect.appId && appId !== this.expect.appId) throw new X402Error('Pool contract mismatch. Refresh and try again.', 'bad_request');
    if (poolId !== this.expect.poolId || outcome !== this.expect.outcome) throw new X402Error('Pool or pick mismatch. Refresh and try again.', 'bad_request');
    if (amount !== this.expect.amountMicro) throw new X402Error('Amount mismatch. Refresh and try again.', 'bad_request');
    // Same bounds as the page and the gateway ($1..$500); the stock AVM client's
    // spend cap isn't applied to a custom scheme, so enforce it here.
    if (amount < 1_000_000n || amount > 500_000_000n) throw new X402Error('Bets are $1 to $500.', 'limit');
    if (String(req.asset) !== String(USDC_ASA)) throw new X402Error('Unexpected payment asset.', 'bad_request');
    const appAddr = appAddress(appId);
    if (req.payTo !== appAddr) throw new X402Error('Payment must go to the pool contract.', 'bad_request');

    const sp = await suggestedParams(100);
    const zero = { ...sp, flatFee: true, fee: 0n };
    const feePayer = extra.feePayer || null;

    const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: this.address,
      receiver: appAddr,
      assetIndex: USDC_ASA,
      amount,
      note: enc(`x402-payment-v${x402Version}-${Date.now()}`),
      suggestedParams: feePayer ? zero : { ...sp, flatFee: true, fee: BigInt(sp.minFee ?? 1000n) * 2n },
    });
    const method = abiMethod('bet');
    const appl = algosdk.makeApplicationNoOpTxnFromObject({
      sender: this.address,
      appIndex: appId,
      appArgs: [
        method.getSelector(),
        algosdk.ABIType.from('uint64').encode(poolId),
        algosdk.ABIType.from('uint8').encode(outcome),
      ],
      boxes: [
        { appIndex: appId, name: poolBoxName(poolId) },
        { appIndex: appId, name: betBoxName(poolId, this.address) },
      ],
      suggestedParams: zero,
    });

    let txns = [axfer, appl];
    if (feePayer) {
      // Same fee formula the stock client uses: max(feePerByte × size, minFee) per txn.
      const feePerByte = Number(sp.fee ?? 0);
      const minFee = Number(sp.minFee ?? 1000);
      const draft = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: feePayer, receiver: feePayer, amount: 0, note: enc(`x402-fee-payer-${Date.now()}`), suggestedParams: zero,
      });
      let groupFee = 0;
      for (const t of [draft, axfer, appl]) {
        const size = algosdk.encodeUnsignedTransaction(t).length;
        groupFee += feePerByte > 0 ? Math.max(feePerByte * size, minFee) : minFee;
      }
      const payer = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: feePayer, receiver: feePayer, amount: 0, note: draft.note, suggestedParams: { ...sp, flatFee: true, fee: BigInt(groupFee) },
      });
      txns = [payer, axfer, appl];
    }
    algosdk.assignGroupID(txns);

    const bettorIdx = txns.map((t, i) => (t.sender.toString() === this.address ? i : -1)).filter((i) => i >= 0);
    const signed = await this.signTransactions([
      txns.map((txn, i) => ({ txn, signers: bettorIdx.includes(i) ? [this.address] : [] })),
    ]);
    const signedList = (signed || []).filter(Boolean);
    if (signedList.length < bettorIdx.length) throw new Error('Wallet did not sign the bet');

    const paymentGroup = txns.map((txn, i) => {
      const k = bettorIdx.indexOf(i);
      return k >= 0 ? b64(signedList[k]) : b64(algosdk.encodeUnsignedTransaction(txn));
    });
    return { x402Version, payload: { paymentGroup, paymentIndex: feePayer ? 1 : 0 } };
  }
}

const enc = (s) => Uint8Array.from(new TextEncoder().encode(s));

// -> { body, txId }   txId = the USDC transfer's id (the x402 receipt)
export async function payPoolBet(url, { address, signTransactions, poolId, outcome, amountMicro, appId }) {
  const scheme = new PoolBetScheme({ address, signTransactions, poolId, outcome, amountMicro, appId });
  const client = x402Client.fromConfig({
    schemes: [{ network: NETWORK, client: scheme }],
    spendControls: {
      maxAmountPerPayment: '$500',
      allowedAssets: [{ network: NETWORK, asset: String(USDC_ASA), maxAmountPerPayment: '500000000' }],
    },
  });
  const http = new x402HTTPClient(client);

  const first = await fetch(url);
  if (first.status !== 402) {
    const b = await first.json().catch(() => ({}));
    if (first.status === 503) throw new X402Error('Betting isn’t open yet.', 'closed');
    throw new X402Error(b?.error || `Unexpected response (${first.status})`, 'bad_request');
  }
  const required = http.getPaymentRequiredResponse((h) => first.headers.get(h), await first.json().catch(() => undefined));

  let payload;
  try {
    payload = await http.createPaymentPayload(required);
  } catch (err) {
    if (err instanceof X402Error) throw err;
    const msg = String(err?.message || err);
    if (/spendControls/i.test(msg)) throw new X402Error('This amount can’t be bet from this page.', 'limit');
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
    let verifyError = '';
    if (res.status === 402) {
      try { verifyError = http.getPaymentRequiredResponse((h) => res.headers.get(h), body)?.error || ''; } catch { /* none */ }
    }
    const reason = settle?.errorReason || settle?.errorMessage || verifyError || body?.error || `Bet failed (${res.status})`;
    if (/balance|overspend|insufficient|underflow/i.test(reason)) throw new X402Error('Not enough USDC in your wallet.', 'funds');
    if (/dead|expired|round/i.test(reason)) throw new X402Error('That took too long to approve. Try again.', 'expired');
    if (/close|assert|logic eval/i.test(reason)) throw new X402Error('The pool didn’t accept this bet (it may have just closed or hit its cap).', 'rejected');
    throw new X402Error(reason, 'settle_failed');
  }
  return { body, txId: settle?.transaction || null };
}
