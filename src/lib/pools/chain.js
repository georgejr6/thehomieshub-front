import algosdk from 'algosdk';

// On-chain helpers for the HomiesPools contract (Algorand mainnet).
// Spec: C:\Users\13478\dev\homies-pools\SPEC.md §1. The ABI comes from the
// contract's ARC-56 JSON when it's present next to this file; otherwise the
// method signature strings from the spec are used (selectors are identical).

export const USDC_ASA = 31566704;
export const CANCEL_VOTE = 200;
export const FEE_BPS = 1000;
export const MIN_BET_MICRO = 1_000_000;
export const ALGOD_URL = 'https://mainnet-api.algonode.cloud';
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
  if (!_algod) _algod = new algosdk.Algodv2('', ALGOD_URL, '');
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

// The judge's vote: one app call from the signer, who pays the fee. A deciding
// vote sends the house fee as an inner transaction, so cover one inner fee too.
export async function buildVoteTxn({ appId, poolId, choice, signer }) {
  const sp = await suggestedParams();
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
    suggestedParams: { ...sp, flatFee: true, fee: minFee * 2n },
  });
}

// Send already-signed bytes and wait for the round.
export async function sendSigned(signedBlobs) {
  const blobs = signedBlobs.filter(Boolean);
  const { txid } = await algod().sendRawTransaction(blobs).do();
  await algosdk.waitForConfirmation(algod(), txid, 12);
  return txid;
}

// Read the pool box straight from the chain (for the judge page's vote count).
// Only decodes when the ARC-56 struct definition is available; the backend's
// copy of the numbers is the fallback.
export async function readPoolBox(appId, poolId) {
  const fields = ARC56?.structs?.Pool;
  if (!fields || !appId) return null;
  try {
    const box = await algod().getApplicationBoxByName(BigInt(appId), poolBoxName(poolId)).do();
    const tupleType = algosdk.ABIType.from(`(${fields.map((f) => f.type).join(',')})`);
    const values = tupleType.decode(box.value);
    const out = {};
    fields.forEach((f, i) => { out[f.name] = values[i]; });
    return out;
  } catch {
    return null;
  }
}

// What a winning stake would pay right now (pari-mutuel, 10% house fee).
// totals: micro-USDC per outcome; adding `addMicro` on `outcome` first.
export function estimatePayoutMicro(totals, outcome, stakeMicro, addMicro = stakeMicro) {
  const t = totals.map((x) => Number(x || 0));
  const total = t.reduce((a, b) => a + b, 0) + addMicro;
  const onPick = (t[outcome] || 0) + addMicro;
  if (!onPick) return 0;
  const net = total - Math.floor((total * FEE_BPS) / 10000);
  return Math.floor((stakeMicro * net) / onPick);
}
