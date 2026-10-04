import algosdk from 'algosdk';

// On-chain helpers for the HomiesPools contract (Algorand mainnet).
// Spec: C:\Users\13478\dev\homies-pools\SPEC.md §1. The ABI comes from the
// contract's ARC-56 JSON when it's present next to this file; otherwise the
// method signature strings from the spec are used (selectors are identical).

// Mainnet by default; a testnet build sets VITE_POOLS_USDC_ASA_ID / VITE_POOLS_ALGOD_URL
// (and VITE_POOLS_NETWORK in poolPay.js) instead of changing code.
export const USDC_ASA = Number(import.meta.env.VITE_POOLS_USDC_ASA_ID) || 31566704;
export const CANCEL_VOTE = 200;
export const FEE_BPS = 1000;
export const MIN_BET_MICRO = 1_000_000;
export const ALGOD_URL = import.meta.env.VITE_POOLS_ALGOD_URL || 'https://mainnet-api.algonode.cloud';
export const EXPLORER = 'https://allo.info';

export const explorerTx = (txId) => `${EXPLORER}/tx/${txId}`;
export const explorerApp = (appId) => `${EXPLORER}/application/${appId}`;
export const explorerAccount = (a) => `${EXPLORER}/account/${a}`;

// Optional at build time: the contract agent writes this file. import.meta.glob
// returns {} when it's missing, so the build never breaks on it.
const arcFiles = import.meta.glob('./HomiesPools.arc56.json', { eager: true });
const ARC56 = Object.values(arcFiles)[0]?.default || Object.values(arcFiles)[0] || null;

const SIGNATURES = {
  bet: 'bet(axfer,uint64,uint8)void',
  vote: 'vote(uint64,uint8)void',
  claim: 'claim(uint64,address)void',
  expire: 'expire(uint64)void',
  close_now: 'close_now(uint64)void',
};

function arcMethod(name) {
  const m = ARC56?.methods?.find((x) => x.name === name);
  if (!m) return null;
  try {
    return new algosdk.ABIMethod({ name: m.name, args: m.args.map((a) => ({ type: a.type, name: a.name })), returns: { type: m.returns?.type || 'void' } });
  } catch { return null; }
}

export function abiMethod(name) {
  return arcMethod(name) || algosdk.ABIMethod.fromSignature(SIGNATURES[name]);
}

export const appAddress = (appId) => algosdk.getApplicationAddress(BigInt(appId)).toString();

let _algod;
export function algod() {
  if (!_algod) {
    // Keep any port in the URL (algosdk otherwise defaults to 80/443).
    const u = new URL(ALGOD_URL);
    const base = `${u.protocol}//${u.hostname}`;
    _algod = new algosdk.Algodv2(import.meta.env?.VITE_POOLS_ALGOD_TOKEN || '', base, u.port || '');
  }
  return _algod;
}

// Box names: 'p' + itob(pool_id), 'b' + itob(pool_id) + bettor public key.
const enc = new TextEncoder();
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  parts.forEach((p) => { out.set(p, o); o += p.length; });
  return out;
};
export const poolBoxName = (poolId) => concat(enc.encode('p'), algosdk.encodeUint64(BigInt(poolId)));
export const betBoxName = (poolId, bettor) => concat(enc.encode('b'), algosdk.encodeUint64(BigInt(poolId)), algosdk.decodeAddress(bettor).publicKey);

// Suggested params with a longer validity window: opening Pera on a phone,
// approving and coming back can take minutes (default 10 rounds ≈ 28 s).
export async function suggestedParams(rounds = 100) {
  const sp = await algod().getTransactionParams().do();
  return { ...sp, lastValid: BigInt(sp.firstValid) + BigInt(rounds) };
}

// The judge's vote: one app call from the signer, who pays the fee. Since
// contract v2 the deciding vote only records the 10% fee (the backend pulls it
// later with withdraw_fee), so vote has no inner txn: no USDC/account refs and
// no extra fee — just the pool box.
export async function buildVoteTxn({ appId, poolId, choice, signer, params }) {
  const sp = params || await suggestedParams();
  const method = abiMethod('vote');
  const minFee = BigInt(sp.minFee ?? 1000n);
  return algosdk.makeApplicationNoOpTxnFromObject({
    sender: signer,
    appIndex: BigInt(appId),
    appArgs: [
      method.getSelector(),
      algosdk.ABIType.from('uint64').encode(BigInt(poolId)),
      algosdk.ABIType.from('uint8').encode(choice),
    ],
    boxes: [{ appIndex: BigInt(appId), name: poolBoxName(poolId) }],
    suggestedParams: { ...sp, flatFee: true, fee: minFee },
  });
}

// close_now(pool_id): the house or an active judge ends betting right away
// (close_ts = now). Only while the pool is OPEN and before close_ts. No inner txn.
export async function buildCloseNowTxn({ appId, poolId, signer, params }) {
  const sp = params || await suggestedParams();
  const method = abiMethod('close_now');
  const minFee = BigInt(sp.minFee ?? 1000n);
  return algosdk.makeApplicationNoOpTxnFromObject({
    sender: signer,
    appIndex: BigInt(appId),
    appArgs: [method.getSelector(), algosdk.ABIType.from('uint64').encode(BigInt(poolId))],
    boxes: [{ appIndex: BigInt(appId), name: poolBoxName(poolId) }],
    suggestedParams: { ...sp, flatFee: true, fee: minFee },
  });
}

// Send already-signed bytes and wait for the round.
export async function sendSigned(signedBlobs) {
  const blobs = signedBlobs.filter(Boolean);
  const { txid } = await algod().sendRawTransaction(blobs).do();
  await algosdk.waitForConfirmation(algod(), txid, 12);
  return txid;
}

// The contract's house address (global state "house").
export async function readHouse(appId) {
  try {
    const app = await algod().getApplicationByID(BigInt(appId)).do();
    const kv = (app.params.globalState || []).find((g) => new TextDecoder().decode(g.key) === 'house');
    return kv?.value?.bytes?.length === 32 ? algosdk.encodeAddress(kv.value.bytes) : null;
  } catch {
    return null;
  }
}

// Pool struct (contract v2, 289 bytes), field order = box layout. The ARC-56
// JSON's struct is used when present; this is the fallback and the size check.
export const POOL_FIELDS = [
  ['num_outcomes', 'uint8'], ['status', 'uint8'], ['winner', 'uint8'],
  ['close_ts', 'uint64'], ['resolve_by_ts', 'uint64'], ['finalized_ts', 'uint64'],
  ['cap', 'uint64'], ['total', 'uint64'], ['fee', 'uint64'], ['paid_out', 'uint64'],
  ['totals', 'uint64[8]'], ['signers', 'address[3]'], ['votes', 'uint8[3]'], ['meta_hash', 'byte[32]'],
  ['num_signers', 'uint8'], ['threshold', 'uint8'], ['fee_receiver', 'address'], ['fee_paid', 'uint8'],
].map(([name, type]) => ({ name, type }));
export const POOL_BOX_SIZE = 289;

const poolFields = () => ARC56?.structs?.Pool || POOL_FIELDS;
const addrStr = (a) => (typeof a === 'string' ? a : a?.toString?.() ?? String(a));

// Decode the raw pool box. Numbers: uint8 -> Number, uint64 -> BigInt;
// addresses -> strings; fee_paid -> boolean. Throws on a wrong-size box
// (e.g. a v1 contract's 288-byte struct) instead of misreading it.
export function decodePoolBox(bytes) {
  const fields = poolFields();
  const tupleType = algosdk.ABIType.from(`(${fields.map((f) => f.type).join(',')})`);
  if (bytes.length !== tupleType.byteLen()) throw new Error(`Pool box is ${bytes.length} bytes, expected ${tupleType.byteLen()}`);
  const values = tupleType.decode(bytes);
  const out = {};
  fields.forEach((f, i) => {
    let v = values[i];
    if (f.type === 'address') v = addrStr(v);
    else if (f.type === 'address[3]') v = Array.from(v, addrStr);
    else if (f.type === 'uint8') v = Number(v);
    else if (f.type === 'uint8[3]') v = Array.from(v, Number);
    else if (f.type === 'uint64') v = BigInt(v);
    else if (f.type === 'uint64[8]') v = Array.from(v, BigInt);
    out[f.name] = v;
  });
  out.fee_paid = !!out.fee_paid;
  return out;
}

// Read the pool box straight from the chain (judge page: vote count, status,
// close time). The backend's copy of the numbers is the fallback.
export async function readPoolBox(appId, poolId) {
  if (!appId) return null;
  try {
    const box = await algod().getApplicationBoxByName(BigInt(appId), poolBoxName(poolId)).do();
    return decodePoolBox(box.value);
  } catch {
    return null;
  }
}

// What a winning stake would pay right now (pari-mutuel, 10% house fee).
// Same integer math as the contract: fee = floor(total * 1000 / 10000),
// payout = floor(stake * (total - fee) / totals[winner]). BigInt so large pots
// don't lose precision. totals: micro-USDC per outcome; `addMicro` is added to
// `outcome` (and the pot) first.
export function estimatePayoutMicro(totals, outcome, stakeMicro, addMicro = stakeMicro) {
  const big = (x) => BigInt(Math.max(0, Math.floor(Number(x || 0))));
  const t = totals.map(big);
  const add = big(addMicro);
  const total = t.reduce((a, b) => a + b, 0n) + add;
  const onPick = (t[outcome] || 0n) + add;
  if (onPick === 0n) return 0;
  const net = total - (total * BigInt(FEE_BPS)) / 10000n;
  return Number((big(stakeMicro) * net) / onPick);
}

// USDC + ALGO balance for the /fight funding step, on the pools network
// (same shape as x402Pay.walletStatus, which is fixed to mainnet for /sponsor).
export async function walletStatus(address) {
  const r = await fetch(`${ALGOD_URL}/v2/accounts/${address}`);
  if (!r.ok) throw new Error('Could not read wallet');
  const a = await r.json();
  const usdc = (a.assets || []).find((x) => x['asset-id'] === USDC_ASA);
  return { algo: (a.amount || 0) / 1e6, optedIn: !!usdc, usdc: usdc ? usdc.amount / 1e6 : 0 };
}
