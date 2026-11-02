import api from '@/api/homieshub';
import { openChatUserCard } from '@/components/chat/UserCard';

// Messages relayed from YouTube/Kick carry `external` { platform, authorId,
// name, avatarUrl, linkedUserId }. Older ones only have "[YouTube: Name] text".
// Only https avatars (no mixed content / odd schemes).
export const safeAvatar = (u) => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : null);

const PREFIX_RE = /^\[(?:YouTube|Kick)(?::\s*[^\]]*)?\]\s*/i;
export function externalText(content, external) {
  const s = String(content ?? '');
  return external ? s.replace(PREFIX_RE, '') : s;
}

// Open the card of the Homies user an external chatter linked to. The card
// only needs {id, username}; fetch the profile first so it has both.
export async function openLinkedUserCard(userId, e) {
  if (!userId) return;
  e?.stopPropagation?.();
  const r = e?.currentTarget?.getBoundingClientRect?.();
  const x = r ? r.left : 16;
  const y = r ? r.bottom : 80;
  try {
    const { data } = await api.get(`/chat/members/${userId}/profile`);
    const u = data?.result;
    if (!u?.username) return;
    openChatUserCard({ ...u, id: u.id || userId }, { currentTarget: { getBoundingClientRect: () => ({ left: x, bottom: y }) } });
  } catch { /* not found / signed out: do nothing */ }
}
