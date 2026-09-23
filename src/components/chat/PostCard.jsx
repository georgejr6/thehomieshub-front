import React, { useState } from 'react';
import { BarChart3, CalendarDays, MapPin, Check, Plane } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';

// A Homies post (poll / event / trip) shared into chat. It's the same
// CommunityPost the app feed shows — voting here votes on the real post,
// and votes from the app update this card live (post.updated).

function PollCard({ post, onVote, onError }) {
  const poll = post.poll;
  const [busy, setBusy] = useState(false);
  const total = poll.options.reduce((n, o) => n + o.votes, 0);
  const expired = poll.expiresAt && new Date(poll.expiresAt) < new Date();
  const showResults = !!poll.myVote || expired;

  const vote = async (optionId) => {
    if (busy || expired || optionId === poll.myVote) return;
    setBusy(true);
    try { await onVote(post.id, optionId); } catch (err) { onError(err.response?.data?.message || 'Couldn\'t vote.'); }
    setBusy(false);
  };

  return (
    <div className="mt-1 w-full max-w-[440px] rounded-lg border border-[#1E1F22] bg-[#2B2D31] p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#949BA4]"><BarChart3 className="h-4 w-4" /> Poll</div>
      <div className="mb-3 text-[17px] font-semibold text-white">{poll.question}</div>
      <div className="space-y-2">
        {poll.options.map((o) => {
          const pct = total ? Math.round((o.votes / total) * 100) : 0;
          const mine = poll.myVote === o.id;
          return (
            <button
              key={o.id}
              onClick={() => vote(o.id)}
              disabled={busy || expired}
              className={cn(
                'relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left transition-all duration-200',
                mine ? 'border-[#5865F2]' : 'border-[#3F4147] hover:border-[#5865F2]/60',
                !expired && 'active:scale-[0.99]'
              )}
            >
              {showResults && (
                <span className={cn('absolute inset-y-0 left-0 transition-[width] duration-500 ease-out', mine ? 'bg-[#5865F2]/35' : 'bg-[#4E5058]/40')} style={{ width: `${pct}%` }} />
              )}
              <span className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[15px] text-[#DBDEE1]">
                  {mine && <Check className="h-4 w-4 text-[#5865F2]" />}
                  {o.text}
                </span>
                {showResults && <span className="text-sm font-semibold tabular-nums text-[#DBDEE1]">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-[#949BA4]">
        {total} vote{total === 1 ? '' : 's'}
        {poll.expiresAt && <> · {expired ? 'Poll closed' : `${formatDistanceToNowStrict(new Date(poll.expiresAt))} left`}</>}
        {!showResults && !expired && <> · vote to see results</>}
      </div>
    </div>
  );
}

function EventCard({ post }) {
  const e = post.event;
  const start = e.startAt ? new Date(e.startAt) : null;
  return (
    <div className="mt-1 w-full max-w-[440px] overflow-hidden rounded-lg border border-[#1E1F22] bg-[#2B2D31]">
      {e.coverImageUrl && <img src={e.coverImageUrl} alt="" className="h-36 w-full object-cover" />}
      <div className="p-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#23A55A]"><CalendarDays className="h-4 w-4" /> Event</div>
        {start && <div className="text-sm font-semibold text-[#23A55A]">{format(start, 'EEE, MMM d · h:mm a')}</div>}
        <div className="mt-0.5 text-[17px] font-semibold text-white">{e.title}</div>
        {e.description && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[#B5BAC1]">{e.description}</p>}
        {(e.locationName || e.locationAddress) && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-[#B5BAC1]"><MapPin className="h-4 w-4" /> {e.locationName || e.locationAddress}</div>
        )}
        <div className="mt-2 text-xs text-[#949BA4]">
          {e.isPaid ? `${e.currency} ${e.price}` : 'Free'}{e.attendeeCount ? ` · ${e.attendeeCount} going` : ''}
        </div>
      </div>
    </div>
  );
}

function TripCard({ post }) {
  const t = post.trip;
  return (
    <div className="mt-1 w-full max-w-[440px] overflow-hidden rounded-lg border border-[#1E1F22] bg-[#2B2D31]">
      {t.coverImageUrl && <img src={t.coverImageUrl} alt="" className="h-40 w-full object-cover" />}
      <div className="p-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#00A8FC]"><Plane className="h-4 w-4" /> Trip</div>
        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-[#DBDEE1]">{post.text}</p>
        {t.destinations?.length > 0 && <div className="mt-2 text-xs text-[#949BA4]">{t.destinations.join(' · ')}</div>}
      </div>
    </div>
  );
}

export default function PostCard({ post, onVote, onError }) {
  if (!post) return null;
  if (post.deleted) return <div className="mt-1 text-sm italic text-[#949BA4]">This post was deleted.</div>;
  if (post.poll) return <PollCard post={post} onVote={onVote} onError={onError} />;
  if (post.event) return <EventCard post={post} />;
  if (post.trip) return <TripCard post={post} />;
  return null;
}
