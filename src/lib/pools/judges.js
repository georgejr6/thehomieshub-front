import algosdk from 'algosdk';

// Client-side check of a judge set before approve / set_signers. Mirrors the
// contract + backend rules: 1–3 judges, each named, valid and distinct wallets,
// none of them the house or the pool's fee wallet; threshold 1..n.
// `feeWallet` empty means the fee goes to the house. Returns problem strings.
export function judgeProblems(judges, threshold, { house = null, feeWallet = '' } = {}) {
  const out = [];
  const list = judges || [];
  if (list.length < 1 || list.length > 3) out.push('Add 1 to 3 judges.');
  const addrs = list.map((j) => (j.address || '').trim());
  if (list.some((j) => !(j.name || '').trim())) out.push('Name every judge.');
  if (addrs.some((a) => !algosdk.isValidAddress(a))) out.push('Every judge needs a valid Algorand wallet address.');
  if (new Set(addrs).size !== addrs.length) out.push('Each judge needs a different wallet.');
  if (house && addrs.includes(house)) out.push('The house wallet can’t be a judge.');
  const fee = (feeWallet || '').trim();
  if (fee && fee !== house && addrs.includes(fee)) out.push('The fee wallet can’t be a judge.');
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > Math.max(1, list.length)) out.push(`Pick how many must agree (1 to ${Math.max(1, list.length)}).`);
  return out;
}
