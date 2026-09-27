import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Link2 } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';
import { openChatUserCard } from './UserCard';
import Avatar from './Avatar';

// Member rows + search results for /chat. Every row opens the member card
// (UserCard) on click, like Discord.
//
// Staff: GET /chat/members/directory. EVERY account (Discord-only
// placeholders included), matched on username / display name / Discord name,
// filterable by Discord connected / not, with exact totals.
// Everyone else: GET /chat/members?query= (the same search the @mention
// picker uses, Discord names included).

// Linked-Discord marker (lucide has no Discord logo).
export const DiscordMark = ({ className }) => <Link2 aria-label="Discord connected" className={className} />;

export function MemberRow({ m, status, dim, extra }) {
  return (
    <button
      type="button"
      onClick={(e) => openChatUserCard(m, e)}
      className={cn('chat-fade-in flex w-full items-center gap-3 rounded px-2 py-1.5 text-left transition-[background-color,opacity] duration-150 hover:bg-[#35373C] active:bg-[#404249]', dim && 'opacity-40 hover:opacity-100')}
    >
      <div className="relative shrink-0">
        <Avatar user={m} size={32} />
        {status && status !== 'offline' && (
          <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#2B2D31]', status === 'idle' ? 'bg-[#F0B232]' : 'bg-[#23A55A]')} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium leading-5" style={{ color: m.color ? roleColor(m.color) : '#949BA4' }}>{m.displayName}</div>
        {extra}
      </div>
    </button>
  );
}

// "@username · discord name" under the display name.
export function Handles({ m }) {
  const discord = m.discordUsername && m.discordUsername !== m.username ? m.discordUsername : null;
  return (
    <div className="flex items-center gap-1 truncate text-xs text-[#949BA4]">
      {(m.discordConnected || m.discordUsername) && <DiscordMark className="h-3 w-3 shrink-0 text-[#5865F2]" />}
      <span className="truncate">@{m.username}{discord ? ` · ${discord}` : ''}</span>
      {m.placeholder && <span className="shrink-0 rounded bg-[#5865F2]/20 px-1 text-[10px] font-semibold text-[#C9CDFB]">Discord only</span>}
      {m.chatBanned && <span className="shrink-0 font-semibold text-[#F23F43]">banned</span>}
    </div>
  );
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'connected', label: 'Discord' },
  { id: 'not', label: 'No Discord' },
];

export function StaffDirectory({ query }) {
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState({ members: [], total: 0, counts: null, page: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const req = useRef(0);

  const load = async (page = 0) => {
    const id = ++req.current;
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/chat/members/directory', { params: { query, discord: filter, page } });
      if (id !== req.current) return;
      const r = res.result;
      setData((cur) => ({ ...r, members: page ? [...cur.members, ...r.members] : r.members }));
    } catch (err) {
      if (id === req.current) setError(err.response?.data?.message || "Couldn't load members.");
    } finally {
      if (id === req.current) setLoading(false);
    }
  };
  useEffect(() => {
    const t = setTimeout(() => load(0), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = data.counts;
  const count = (id) => (c ? (id === 'connected' ? c.connected : id === 'not' ? c.notConnected : c.all) : null);
  return (
    <div>
      {c && (
        <div className="grid grid-cols-3 gap-1 px-2 pb-2 text-center">
          {[['Members', c.all], ['In the app', c.app], ['Discord only', c.discordOnly]].map(([label, n]) => (
            <div key={label} className="rounded-lg bg-[#1E1F22] px-1 py-1.5">
              <div className="text-base font-bold text-white">{Number(n).toLocaleString()}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#949BA4]">{label}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-1 px-2 pb-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors', filter === f.id ? 'bg-[#5865F2] text-white' : 'bg-[#1E1F22] text-[#B5BAC1] hover:text-white')}>
            {f.id === 'connected' && <DiscordMark className="h-3 w-3" />}
            {f.label}
            {count(f.id) !== null && <span className="opacity-70">{count(f.id).toLocaleString()}</span>}
          </button>
        ))}
      </div>
      <h3 className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-[#949BA4]">
        {query ? 'Results' : 'Everyone'} — {data.total.toLocaleString()}
      </h3>
      {error && <p className="px-2 py-2 text-sm text-[#F23F43]">{error}</p>}
      {data.members.map((m) => <MemberRow key={m.id} m={m} status={m.status} extra={<Handles m={m} />} />)}
      {loading && <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-[#949BA4]" /></div>}
      {!loading && !data.members.length && !error && <p className="px-2 py-3 text-sm text-[#949BA4]">No one matches.</p>}
      {!loading && data.members.length < data.total && (
        <button type="button" onClick={() => load(data.page + 1)} className="mx-2 mt-2 w-[calc(100%-1rem)] rounded bg-[#1E1F22] py-1.5 text-sm text-[#B5BAC1] hover:text-white">Load more</button>
      )}
    </div>
  );
}

export function MemberResults({ query, searchMembers }) {
  const [list, setList] = useState(null);
  const req = useRef(0);
  useEffect(() => {
    const id = ++req.current;
    const t = setTimeout(async () => {
      const res = await searchMembers(query).catch(() => []);
      if (id === req.current) setList(res);
    }, query ? 200 : 0);
    return () => clearTimeout(t);
  }, [query, searchMembers]);
  if (!list) return <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-[#949BA4]" /></div>;
  return (
    <div>
      <h3 className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-[#949BA4]">{query ? 'Results' : 'Members'} — {list.length}</h3>
      {list.map((m) => <MemberRow key={m.id} m={m} status={m.status} extra={<Handles m={m} />} />)}
      {!list.length && <p className="px-2 py-3 text-sm text-[#949BA4]">No one matches.</p>}
    </div>
  );
}
