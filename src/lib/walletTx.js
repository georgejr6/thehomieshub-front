// Transaction-history wording shared by the wallet screens. New rows carry
// meta.label from the backend ("Gifted @x 1 month of Homies"); older rows
// fall back by type.
const FALLBACK = {
  topup: 'Bought points',
  gift_sent: 'Sent points',
  gift_received: 'Received points',
  adjustment: 'Adjustment',
  payout: 'Payout',
  earn: 'Chat participation',
  spend: 'Spent points',
  membership_received: 'Membership gift',
  refund: 'Refund',
};

export function txLabel(t) {
  if (t?.meta?.label) return t.meta.label;
  if (t?.type === 'topup') return `Bought points${t?.meta?.pack ? ` (${t.meta.pack})` : ''}`;
  return FALLBACK[t?.type] || t?.type || 'Transaction';
}

export function txSubline(t) {
  const m = t?.meta || {};
  const parts = [];
  if (m.amountCents) parts.push(`$${(m.amountCents / 100).toFixed(2)}${m.cardLast4 ? ` · card •••• ${m.cardLast4}` : ''}`);
  if (m.endsAt) parts.push(`Access ${new Date(m.startsAt || t.createdAt).toLocaleDateString()} → ${new Date(m.endsAt).toLocaleDateString()}`);
  if (t?.type === 'earn' && (m.msgPts || m.reactPts)) parts.push(`${m.msgPts || 0} from messages · ${m.reactPts || 0} from reactions`);
  return parts.join(' · ');
}

// Zero-point rows (e.g. a membership someone gifted you) show a badge, not "+0".
export const txBadge = (t) => (t?.type === 'membership_received' ? '🎁 Gift' : '');
