import api from '@/api/homieshub';

// Backend: homieshub-backend routes/pools.js mounted at /api/pools (SPEC §3).
// normalizePool() accepts the documented shape plus a few likely variants so
// the pages don't break on small naming differences.

export const ENV_APP_ID = import.meta.env.VITE_POOLS_APP_ID || null;
export const DEFAULT_GATEWAY = import.meta.env.VITE_X402_GATEWAY_URL || 'https://digitvl-x402-gateway-production.up.railway.app';

const num = (v) => (v == null ? 0 : Number(v));

export function normalizePool(p) {
  if (!p) return null;
  const chain = p.chain || p.chainSnapshot || {};
  const outcomes = (p.outcomes || []).map((o) => (typeof o === 'string' ? o : o?.label || ''));
  // POOLS_API.md: outcomes[i].totalMicro (string), pool.totalMicro (string).
  const rawTotals = chain.totals || p.totals || [];
  const totals = outcomes.map((_, i) => num(p.outcomes?.[i]?.totalMicro ?? rawTotals[i]));
  const total = num(p.totalMicro ?? chain.total ?? p.total ?? totals.reduce((a, b) => a + b, 0));
  const signers = (p.signers || []).map((s) => (typeof s === 'string' ? { address: s, name: '' } : { address: s.address, name: s.name || '' }));
  const threshold = Number(p.threshold ?? chain.threshold ?? (signers.length >= 3 ? 2 : signers.length || 1));
  return {
    raw: p,
    id: p._id || p.id,
    onChainId: p.onChainId ?? p.chainId ?? null,
    title: p.title || 'Pool',
    description: p.description || '',
    outcomes,
    closeAt: p.closeAt ? new Date(p.closeAt) : null,
    resolveBy: p.resolveBy ? new Date(p.resolveBy) : null,
    signers,
    threshold,
    status: p.status || 'live',
    kind: p.kind || 'house',
    proposer: p.proposer || null,
    feeReceiver: p.feeReceiver || chain.feeReceiver || null,
    appId: p.appId || chain.appId || ENV_APP_ID,
    totals,
    total,
    fee: num(p.feeMicro ?? chain.fee ?? p.fee),
    bettingOpen: p.bettingOpen ?? null,
    rejectReason: p.rejectReason || '',
    winner: chain.winner ?? p.winner ?? null,
    chainStatus: chain.status ?? null,
    votes: chain.votes || p.votes || null,
    bettors: p.bettors ?? p.betCount ?? null,
    hasBets: !!(p.hasBets ?? (total > 0)),
    signersLocked: p.signersLocked ?? (total > 0),
    gatewayUrl: p.gatewayUrl || null,
    createdAt: p.createdAt ? new Date(p.createdAt) : null,
    syncedAt: chain.syncedAt || p.syncedAt || null,
  };
}

const list = (data, key) => (Array.isArray(data) ? data : data?.[key] || data?.items || []);

export async function fetchPools() {
  const { data } = await api.get('/pools');
  return list(data, 'pools').map(normalizePool);
}

export async function fetchPool(id) {
  const { data } = await api.get(`/pools/${id}`);
  return normalizePool(data?.pool || data);
}

export async function fetchMyBets(id) {
  const { data } = await api.get(`/pools/${id}/mine`);
  return list(data, 'bets').filter((b) => b.status !== 'rejected').map((b) => ({
    id: b.id,
    status: b.status || 'confirmed',
    txId: b.txId,
    outcome: Number(b.outcome),
    amountMicro: num(b.amountMicro),
    bettor: b.bettor,
    claimed: !!b.claimed,
    claimTxId: b.claimTxId || null,
    payoutMicro: b.payoutMicro != null ? num(b.payoutMicro) : null,
    createdAt: b.at || b.createdAt ? new Date(b.at || b.createdAt) : null,
  }));
}

// -> { id, ref, amountCents, poolId, outcome, gatewayUrl, betUrl, appId, appAddress }
export async function createIntent(id, { outcome, amountUsd, wallet }) {
  const { data } = await api.post(`/pools/${id}/intent`, { outcome, amountUsd, wallet });
  return data;
}

export const proposePool = (body) => api.post('/pools/propose', body).then((r) => r.data);
export const requestClaim = (id) => api.post(`/pools/${id}/claim`).then((r) => r.data);

export async function fetchProposals() {
  const { data } = await api.get('/pools/admin/proposals', { params: { status: 'proposed' } });
  return list(data, 'proposals').map(normalizePool);
}
export const approveProposal = (id, body = {}) => api.post(`/pools/admin/${id}/approve`, body).then((r) => r.data);
export const rejectProposal = (id, reason) => api.post(`/pools/admin/${id}/reject`, { reason }).then((r) => r.data);
export const updateFeeReceiver = (id, feeReceiver) => api.post(`/pools/admin/${id}/fee-receiver`, { feeReceiver }).then((r) => r.data);
export const updateSigners = (id, signers, threshold) => api.post(`/pools/admin/${id}/signers`, { signers, threshold }).then((r) => r.data);

export const usdFromMicro = (m) => {
  const v = Number(m || 0) / 1e6;
  return `$${v.toFixed(2).replace(/\.00$/, '')}`;
};

export const apiError = (err, fallback = 'Something went wrong') => err?.response?.data?.error || err?.message || fallback;

// Human status for a pool.
export function poolPhase(pool) {
  if (!pool) return 'loading';
  if (pool.status === 'resolved') return 'resolved';
  if (pool.status === 'cancelled') return 'cancelled';
  if (pool.status === 'swept') return 'swept';
  if (pool.status === 'proposed') return 'proposed';
  if (pool.status === 'rejected') return 'rejected';
  if (pool.bettingOpen === false) return 'closed';
  if (pool.closeAt && Date.now() >= pool.closeAt.getTime()) return 'closed';
  return 'open';
}

export function phaseLabel(phase) {
  return {
    open: 'Open', closed: 'Betting closed', resolved: 'Result in', cancelled: 'Cancelled · refunded',
    swept: 'Closed out', proposed: 'Waiting for approval', rejected: 'Rejected', loading: '…',
  }[phase] || phase;
}

export function judgesLine(pool) {
  const n = pool?.signers?.length || 0;
  const k = pool?.threshold || n;
  if (!n) return 'Neutral judges confirm the result.';
  if (n === 1) return '1 neutral judge confirms the result.';
  return `${n} neutral judges — ${k} of them must agree on the result.`;
}
