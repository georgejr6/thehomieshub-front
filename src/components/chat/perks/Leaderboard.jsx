import React, { useEffect, useRef, useState } from 'react';
import { X, Trophy, Gift, Flame, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roleColor } from '../ChatMarkdown';

// Homies Points leaderboard: top gifters (points spent on gifts/shoutouts +
// gift count) and most active (points earned by chatting / reactions), for
// this week, this month or all time. Backed by GET /api/chat/leaderboard.
// Bottom sheet on phones, centred panel on desktop (same shell as PerksSheet).

const PERIODS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'all', label: 'All time' },
];
const MEDALS = ['🥇', '🥈', '🥉'];
const fmt = (n) => (n || 0).toLocaleString();

function Avatar({ u }) {
  if (u?.avatarUrl) return <img src={u.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full bg-[#1E1F22] object-cover" />;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-sm font-semibold text-white">
      {(u?.displayName || u?.username || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

function Row({ rank, entry, mine, stat, sub }) {
  const u = entry.user || {};
  return (
    <li
      className={cn(
        'chat-fade-up flex items-center gap-3 rounded-lg px-2.5 py-2',
        mine ? 'bg-[#5865F2]/20 ring-1 ring-[#5865F2]/60' : rank <= 3 ? 'bg-[#2B2D31]' : ''
      )}
      style={{ animationDelay: `${Math.min(rank, 10) * 25}ms` }}
    >
      <span className={cn('w-7 shrink-0 text-center font-bold tabular-nums', rank <= 3 ? 'text-xl' : 'text-sm text-[#949BA4]')}>
        {rank <= 3 ? MEDALS[rank - 1] : rank}
      </span>
      <Avatar u={u} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold" style={{ color: u.color ? roleColor(u.color) : '#F2F3F5' }}>
          {u.displayName || u.username || 'Someone'}{mine && <span className="ml-1.5 text-xs font-medium text-[#B5BAC1]">(you)</span>}
        </span>
        {u.username && <span className="block truncate text-xs text-[#949BA4]">@{u.username}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-bold tabular-nums text-[#F0B94D]">{fmt(stat)} pts</span>
        {sub && <span className="block text-xs text-[#949BA4]">{sub}</span>}
      </span>
    </li>
  );
}

function Board({ title, icon: Icon, list, meId, kind }) {
  return (
    <section>
      <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-[#949BA4]">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      {list?.length ? (
        <ol className="space-y-1">
          {list.map((e, i) => (
            <Row
              key={e.user?.id || i}
              rank={i + 1}
              entry={e}
              mine={!!meId && e.user?.id === meId}
              stat={e.points}
              sub={kind === 'gifters' ? `${fmt(e.gifts)} gift${e.gifts === 1 ? '' : 's'}` : null}
            />
          ))}
        </ol>
      ) : (
        <p className="rounded-lg bg-[#2B2D31] px-3 py-4 text-center text-sm text-[#949BA4]">
          {kind === 'gifters' ? 'No gifts yet — be the first.' : 'Nobody has earned points yet.'}
        </p>
      )}
    </section>
  );
}

export default function Leaderboard({ open, onClose, actions, meId, initial }) {
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(() => (initial ? { week: initial } : {}));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const req = useRef(0);

  useEffect(() => { if (initial) setData((d) => ({ ...d, week: d.week || initial })); }, [initial]);

  // Refetch the visible period every time the sheet opens (cached copy shows
  // instantly meanwhile), and when switching tabs.
  useEffect(() => {
    if (!open) return;
    const id = ++req.current;
    setLoading(true);
    setError('');
    actions.leaderboard(period)
      .then((r) => {
        if (id !== req.current) return;
        if (r) setData((d) => ({ ...d, [period]: r }));
        else setError("The leaderboard isn't available right now.");
      })
      .catch(() => { if (id === req.current) setError("Couldn't load the leaderboard."); })
      .finally(() => { if (id === req.current) setLoading(false); });
  }, [open, period, actions]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const cur = data[period];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Leaderboard">
      <div className="chat-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="chat-sheet-up relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-[#313338] shadow-2xl sm:max-w-md sm:rounded-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#4E5058] sm:hidden" />
        <div className="flex items-center gap-2 px-4 pb-1 pt-3">
          <Trophy className="h-5 w-5 text-[#F0B94D]" />
          <h2 className="flex-1 text-lg font-bold text-white">Leaderboard</h2>
          {loading && cur && <Loader2 className="h-4 w-4 animate-spin text-[#949BA4]" />}
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-4 pb-2 pt-1">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#1E1F22] p-1 text-sm font-semibold">
            {PERIODS.map((p) => (
              <button key={p.id} type="button" onClick={() => setPeriod(p.id)}
                className={cn('rounded-md py-1.5 transition-colors', period === p.id ? 'bg-[#F0B94D] text-black' : 'text-[#B5BAC1] hover:text-white')}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-5 pt-2">
          {!cur ? (
            <div className="flex justify-center py-10">
              {error ? <span className="text-sm text-[#F23F43]">{error}</span> : <Loader2 className="h-6 w-6 animate-spin text-[#949BA4]" />}
            </div>
          ) : (
            <div key={period} className="chat-fade-in space-y-5">
              <Board title="Top gifters" icon={Gift} list={cur.gifters} meId={meId} kind="gifters" />
              <Board title="Most active" icon={Flame} list={cur.earners} meId={meId} kind="earners" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
