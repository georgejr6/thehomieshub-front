import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SmilePlus, Reply, Pencil, Trash2, Pin, Flag, FileText, Download, CornerUpLeft, Loader2, AlertCircle, ArrowDown, MoreHorizontal, Globe, Lock, Copy, ExternalLink, Clock, UserX, Ban } from 'lucide-react';

// What happened on the real Discord, for the mod toast.
const discordNote = (r) => {
  if (!r?.discord || r.discord === 'bridge off') return '';
  if (r.discord === 'applied') return ' — also applied on Discord.';
  if (r.discord === 'not on Discord' || r.discord === 'no Discord account linked') return ' (not on Discord).';
  return ` — Discord: ${r.reason || r.discord}.`;
};
const TIMEOUTS = [['10 minutes', 10], ['1 hour', 60], ['1 day', 1440], ['1 week', 10080]];
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import ChatMarkdown, { roleColor } from './ChatMarkdown';
import PostCard from './PostCard';
import Embed, { embedImageUrl } from './Embed';
import { openImageViewer, ImageViewerHost } from './ImageViewer';

const GROUP_MS = 7 * 60 * 1000;
export const QUICK_EMOJI = ['👍', '❤️', '😂', '🔥', '😮', '😢', '🙏', '💯', '👀', '🎉', '💀', '🤝'];

const nameColor = (a) => (a?.color ? roleColor(a.color) : '#F2F3F5');
const fmtTime = (d) => format(new Date(d), 'h:mm a');
const fmtStamp = (d) => {
  const t = new Date(d);
  if (isToday(t)) return `Today at ${fmtTime(t)}`;
  if (isYesterday(t)) return `Yesterday at ${fmtTime(t)}`;
  return format(t, 'MM/dd/yyyy h:mm a');
};
const fmtBytes = (n) => (!n ? '' : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.ceil(n / 1e3)} KB`);

function Avatar({ author, size = 40 }) {
  const initial = (author?.displayName || author?.username || '?').slice(0, 1).toUpperCase();
  if (author?.avatarUrl) return <img src={author.avatarUrl} alt="" className="shrink-0 rounded-full bg-[#1E1F22] object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-[#5865F2] font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}

// Inline media: big (up to 520px wide / 60% of the screen tall) and sized from
// the stored width/height so the list doesn't jump while images load. Tapping
// an image opens the in-app viewer (ImageViewer.jsx).
const MEDIA_MAX_W = 520;
const MEDIA_MAX_H = 480;
function mediaBox(a) {
  if (!(a.width > 0 && a.height > 0)) return undefined;
  const ratio = (a.width / a.height).toFixed(4);
  return { aspectRatio: `${a.width} / ${a.height}`, width: `min(100%, ${MEDIA_MAX_W}px, ${a.width}px, calc(min(60vh, ${MEDIA_MAX_H}px) * ${ratio}))` };
}

function ImageTile({ a, onOpen, className, fill }) {
  const box = fill ? undefined : mediaBox(a);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={a.name ? `Open image ${a.name}` : 'Open image'}
      className={cn('block cursor-zoom-in overflow-hidden rounded-lg bg-[#2B2D31] transition-[filter] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]', className)}
      style={box}
    >
      <img
        src={a.url}
        alt={a.name || ''}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={fill || box ? 'h-full w-full object-cover' : 'block max-h-[min(60vh,480px)] max-w-full object-contain sm:max-w-[520px]'}
      />
    </button>
  );
}

// One image: natural shape. Several: a 2-column grid (odd count → first spans).
function ImageGallery({ images, onOpen }) {
  if (images.length === 1) return <ImageTile a={images[0]} onOpen={() => onOpen(images[0].url)} />;
  return (
    <div className="grid w-full max-w-[520px] grid-cols-2 gap-1">
      {images.map((a, i) => (
        <ImageTile
          key={a.url}
          a={a}
          fill
          onOpen={() => onOpen(a.url)}
          className={images.length % 2 === 1 && i === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}
        />
      ))}
    </div>
  );
}

function Attachment({ a }) {
  if (a.type === 'video') {
    const box = mediaBox(a);
    return <video src={a.url} controls playsInline preload="metadata" className={cn('rounded-lg bg-black', box ? 'block' : 'max-h-[min(60vh,480px)] max-w-full sm:max-w-[520px]')} style={box} />;
  }
  if (a.type === 'audio') {
    return (
      <div className="w-full max-w-[400px] rounded-lg border border-[#1E1F22] bg-[#2B2D31] p-3">
        <div className="mb-2 truncate text-sm text-[#00A8FC]">{a.name || 'audio'}</div>
        <audio src={a.url} controls preload="metadata" className="w-full" />
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-[400px] items-center gap-3 rounded-lg border border-[#1E1F22] bg-[#2B2D31] p-3">
      <FileText className="h-9 w-9 shrink-0 text-[#B5BAC1]" />
      <div className="min-w-0 flex-1">
        <a href={a.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[#00A8FC] hover:underline">{a.name || 'file'}</a>
        <div className="text-xs text-[#949BA4]">{fmtBytes(a.size)}</div>
      </div>
      <a href={a.url} download={a.name} target="_blank" rel="noopener noreferrer" className="text-[#B5BAC1] hover:text-white"><Download className="h-5 w-5" /></a>
    </div>
  );
}

// Placeholder rows shaped like messages while a channel's history loads.
function MessageSkeleton() {
  const rows = [[0.55, 0.3], [0.7], [0.4, 0.62, 0.2], [0.5], [0.66, 0.45], [0.35]];
  return (
    <div className="chat-fade-in space-y-6 px-4 pt-6">
      {rows.map((lines, i) => (
        <div key={i} className="flex gap-4" style={{ opacity: 1 - i * 0.12 }}>
          <div className="chat-skeleton h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="chat-skeleton h-3.5 w-28 rounded-full" />
            {lines.map((w, j) => <div key={j} className="chat-skeleton h-3.5 rounded-full" style={{ width: `${w * 100}%` }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmojiPicker({ onPick, onClose }) {
  useEffect(() => {
    const h = () => onClose();
    setTimeout(() => window.addEventListener('click', h), 0);
    return () => window.removeEventListener('click', h);
  }, [onClose]);
  return (
    <div onClick={(e) => e.stopPropagation()} className="chat-fade-up absolute right-0 top-8 z-30 grid grid-cols-6 gap-1 rounded-lg border border-[#1E1F22] bg-[#2B2D31] p-2 shadow-xl">
      {QUICK_EMOJI.map((e) => (
        <button key={e} onClick={() => { onPick(e); onClose(); }} className="rounded p-1 text-xl transition-transform duration-100 hover:scale-125 hover:bg-[#404249]">{e}</button>
      ))}
    </div>
  );
}

function MessageItem({ m, grouped, ctx, me, can, isStaff, onReply, actions, onError, highlight }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [picker, setPicker] = useState(false);
  const [more, setMore] = useState(false);
  const mine = m.author?.id === me?.id;
  // Every image in the message (link previews first, as rendered) forms one
  // gallery, so the viewer can swipe between them.
  const images = useMemo(() => (m.attachments || []).filter((a) => a.type === 'image'), [m.attachments]);
  const otherFiles = useMemo(() => (m.attachments || []).filter((a) => a.type !== 'image'), [m.attachments]);
  const openImage = (url) => {
    const gallery = [
      ...(m.embeds || []).map(embedImageUrl).filter(Boolean).map((u) => ({ url: u })),
      ...images.map((a) => ({ url: a.url, name: a.name })),
    ];
    openImageViewer(gallery, Math.max(0, gallery.findIndex((g) => g.url === url)));
  };
  // Animate only messages that arrive while you're watching, not history pages.
  const fresh = useRef(m.pending || Date.now() - new Date(m.createdAt).getTime() < 8000).current;
  const pinged = !mine && (m.mentions?.includes(me?.id) || m.mentionEveryone || m.mentionRoles?.some((r) => me?.roleIds?.includes(r)));

  useEffect(() => { if (ctx.editRequest === m.id) { setDraft(m.content); setEditing(true); ctx.clearEditRequest(); } }, [ctx.editRequest]); // eslint-disable-line

  const react = async (emoji) => {
    const already = m.reactions?.find((r) => r.emoji === emoji)?.users?.includes(me.id);
    try { await actions.react(m.id, emoji, !already); } catch (err) { onError(err.response?.data?.message || 'Couldn\'t react.'); }
  };
  const saveEdit = async () => {
    const text = draft.trim();
    setEditing(false);
    if (!text || text === m.content) return;
    try { await actions.editMessage(m.id, text); } catch (err) { onError(err.response?.data?.message || 'Couldn\'t edit.'); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this message?')) return;
    try { await actions.deleteMessage(m.id); } catch (err) { onError(err.response?.data?.message || 'Couldn\'t delete.'); }
  };
  useEffect(() => {
    if (!more) return undefined;
    const close = () => setMore(false);
    setTimeout(() => window.addEventListener('click', close), 0);
    return () => window.removeEventListener('click', close);
  }, [more]);

  // Public = this message is also a Homies post people can discover.
  const setDiscover = async (mode) => {
    setMore(false);
    try {
      await actions.setDiscover(m.id, mode);
      onError(mode === 'private' ? 'Kept private — it won\'t be shown as a public post.' : 'Made public — it\'s now a discoverable Homies post.');
    } catch (err) {
      onError(err.response?.data?.message || 'Couldn\'t change that.');
    }
  };

  // Staff tools on someone else's message. The server enforces rank.
  const moderate = async (kind, minutes) => {
    setMore(false);
    const who = m.author?.displayName || m.author?.username || 'this member';
    try {
      if (kind === 'timeout') {
        const reason = window.prompt(`Time out ${who} for ${TIMEOUTS.find((t) => t[1] === minutes)[0]}? Reason (optional):`);
        if (reason === null) return;
        onError(`${who} timed out${discordNote(await actions.timeout(m.author.id, minutes, reason))}`);
      } else if (kind === 'kick') {
        const reason = window.prompt(`Kick ${who}? They can rejoin. Reason (optional):`);
        if (reason === null) return;
        onError(`${who} kicked${discordNote(await actions.kick(m.author.id, reason))}`);
      } else if (kind === 'ban') {
        const reason = window.prompt(`BAN ${who}? They can't come back until unbanned. Reason:`);
        if (reason === null) return;
        const wipe = window.confirm('Also delete their messages from the last 24 hours?');
        onError(`${who} banned${discordNote(await actions.ban(m.author.id, reason, wipe ? 24 : 0))}`);
      }
    } catch (err) {
      onError(err.response?.data?.message || "Couldn't do that.");
    }
  };

  const report = async () => {
    const note = window.prompt('Report this message to the mods. What\'s wrong? (optional)');
    if (note === null) return;
    try { await actions.report(m.id, 'other', note); onError('Thanks — the mods have been notified.'); } catch (err) { onError(err.response?.data?.message || 'Couldn\'t report.'); }
  };

  return (
    <div
      id={`msg-${m.id}`}
      className={cn(
        'group relative pl-[72px] pr-4 sm:pr-12 transition-[background-color,opacity] duration-150 hover:bg-[#2E3035]',
        fresh && 'chat-msg-in',
        grouped ? 'py-0.5' : 'mt-[17px] py-0.5',
        pinged && 'border-l-2 border-[#F0B232] bg-[#F0B232]/[0.08] pl-[70px] hover:bg-[#F0B232]/[0.12]',
        highlight && 'bg-[#5865F2]/10',
        m.pending && 'opacity-50'
      )}
    >
      {m.replyTo && !grouped && (
        <div className="relative mb-0.5 flex items-center gap-1 text-[13px] text-[#949BA4]">
          <CornerUpLeft className="absolute -left-9 top-1 h-3.5 w-6 -scale-y-100 text-[#4E5058]" />
          {m.replyTo.deleted ? <span className="italic">Original message was deleted</span> : (
            <>
              <Avatar author={m.replyTo.author} size={16} />
              <span className="font-medium" style={{ color: nameColor(m.replyTo.author) }}>@{m.replyTo.author?.displayName}</span>
              <button onClick={() => ctx.jumpTo(m.replyTo.id)} className="truncate hover:text-white">{m.replyTo.content || 'Click to see attachment'}</button>
            </>
          )}
        </div>
      )}
      {grouped ? (
        <span className="absolute left-0 top-1 w-[72px] text-center text-[11px] leading-[22px] text-[#949BA4] opacity-0 group-hover:opacity-100">{fmtTime(m.createdAt)}</span>
      ) : (
        <>
          <div className="absolute left-4 mt-0.5"><Avatar author={m.author} /></div>
          <div className="flex items-baseline gap-2 leading-[22px]">
            <span className="cursor-pointer font-medium hover:underline" style={{ color: nameColor(m.author) }}>{m.author?.displayName || m.author?.username}</span>
            {m.author?.bot && <span className="rounded bg-[#5865F2] px-1 text-[10px] font-semibold uppercase leading-4 text-white">Bot</span>}
            {m.source?.platform === 'discord' && <span className="rounded bg-[#5865F2]/30 px-1 text-[10px] font-semibold uppercase text-[#C9CDFB]">via Discord</span>}
            <span className="text-xs text-[#949BA4]">{fmtStamp(m.createdAt)}</span>
            {m.discover?.public && (
              <a href={m.discover.postId ? `/post/${m.discover.postId}` : undefined} target="_blank" rel="noopener noreferrer" title="Public — also shared as a discoverable Homies post" className="text-[#949BA4] transition-colors hover:text-[#00A8FC]">
                <Globe className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </>
      )}

      {editing ? (
        <div className="my-1">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
              if (e.key === 'Escape') setEditing(false);
            }}
            rows={Math.min(8, draft.split('\n').length)}
            className="w-full resize-none rounded-lg bg-[#383A40] px-4 py-2.5 text-[#DBDEE1] outline-none"
          />
          <div className="text-xs text-[#949BA4]">escape to <button onClick={() => setEditing(false)} className="text-[#00A8FC] hover:underline">cancel</button> • enter to <button onClick={saveEdit} className="text-[#00A8FC] hover:underline">save</button></div>
        </div>
      ) : (
        <div className="text-[15px] leading-[1.375rem] text-[#DBDEE1]">
          <ChatMarkdown text={m.content} ctx={ctx} />
          {m.editedAt && <span className="ml-1 text-[10px] text-[#949BA4]">(edited)</span>}
        </div>
      )}

      {m.post && <PostCard post={m.post} onVote={actions.votePoll} onError={onError} />}
      {m.embeds?.length > 0 && m.embeds.map((e, i) => <Embed key={i} e={e} ctx={ctx} onOpenImage={openImage} />)}
      {images.length > 0 && <div className="mt-1"><ImageGallery images={images} onOpen={openImage} /></div>}
      {otherFiles.length > 0 && (
        <div className="mt-1 flex flex-col gap-1">{otherFiles.map((a) => <Attachment key={a.url} a={a} />)}</div>
      )}
      {m.held && <div className="mt-0.5 text-xs text-[#F0B232]">Held for mod review — only you and the mods can see this.</div>}
      {m.failed && (
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[#F23F43]">
          <AlertCircle className="h-3.5 w-3.5" /> {m.error || 'Failed to send.'}
          <button onClick={() => actions.discardFailed(m.channelId, m.nonce)} className="underline">Dismiss</button>
        </div>
      )}

      {m.reactions?.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {m.reactions.map((r) => {
            const mineR = r.users?.includes(me?.id);
            return (
              <button
                key={r.emoji}
                onClick={() => react(r.emoji)}
                className={cn(
                  'chat-pop flex items-center gap-1.5 rounded-lg border px-1.5 py-0.5 text-sm transition-[transform,background-color,border-color] duration-150 hover:scale-105 active:scale-95',
                  mineR ? 'border-[#5865F2] bg-[#5865F2]/20 text-white' : 'border-transparent bg-[#2B2D31] text-[#B5BAC1] hover:border-[#4E5058]'
                )}
              >
                {r.emojiUrl ? <img src={r.emojiUrl} alt={r.emoji} className="h-4 w-4" /> : <span>{r.emoji}</span>}
                <span key={r.count} className="chat-bump inline-block text-xs font-semibold tabular-nums">{r.count}</span>
              </button>
            );
          })}
        </div>
      )}

      {!m.pending && !m.failed && !editing && (
        <div className={cn(
          'absolute -top-4 right-4 z-20 flex rounded-md border border-[#1E1F22] bg-[#313338] shadow-md transition-all duration-150',
          picker || more ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100'
        )}>
          {can.react && QUICK_EMOJI.slice(0, 3).map((e) => (
            <button key={e} onClick={() => react(e)} className="px-1.5 py-1 transition-transform duration-100 hover:scale-125 hover:bg-[#404249]" title={`React ${e}`}>{e}</button>
          ))}
          {can.react && (
            <div className="relative">
              <button onClick={() => setPicker((p) => !p)} className="p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" title="Add reaction"><SmilePlus className="h-5 w-5" /></button>
              {picker && <EmojiPicker onPick={react} onClose={() => setPicker(false)} />}
            </div>
          )}
          {can.send && <button onClick={() => onReply(m)} className="p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" title="Reply"><Reply className="h-5 w-5" /></button>}
          {mine && !m.source && <button onClick={() => { setDraft(m.content); setEditing(true); }} className="p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" title="Edit"><Pencil className="h-5 w-5" /></button>}
          {can.manageMessages && <button onClick={async () => { try { const r = await actions.pin(m.id, !m.pinned); onError(`${m.pinned ? 'Unpinned' : 'Pinned'}${discordNote(r?.data?.result)}`); } catch (err) { onError(err.response?.data?.message || "Couldn't pin."); } }} className="p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" title={m.pinned ? 'Unpin' : 'Pin'}><Pin className="h-5 w-5" /></button>}
          {!mine && <button onClick={report} className="p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" title="Report"><Flag className="h-5 w-5" /></button>}
          <div className="relative">
            <button onClick={() => setMore((v) => !v)} className="p-1.5 text-[#B5BAC1] hover:bg-[#404249] hover:text-white" title="More"><MoreHorizontal className="h-5 w-5" /></button>
            {more && (
              <div onClick={(e) => e.stopPropagation()} className="chat-fade-up absolute right-0 top-9 z-40 w-60 rounded-lg border border-[#1E1F22] bg-[#111214] p-1.5 shadow-2xl">
                {mine && m.discover?.eligible && (
                  <>
                    <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase text-[#949BA4]">Discoverability</div>
                    {m.discover.public ? (
                      <button onClick={() => setDiscover('private')} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                        <Lock className="h-4 w-4" /> Make private
                      </button>
                    ) : (
                      <button onClick={() => setDiscover('public')} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                        <Globe className="h-4 w-4" /> Make public
                      </button>
                    )}
                    {m.discover.public && m.discover.postId && (
                      <a href={`/post/${m.discover.postId}`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                        <ExternalLink className="h-4 w-4" /> View public post
                      </a>
                    )}
                    <div className="px-2.5 pb-1 text-[11px] text-[#949BA4]">{m.discover.public ? 'Anyone can find this as a Homies post.' : 'Only people in this channel can see it.'}</div>
                    <div className="my-1 h-px bg-[#2B2D31]" />
                  </>
                )}
                {!mine && isStaff && m.author?.id && (
                  <>
                    <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase text-[#949BA4]">Moderate {m.author.displayName || m.author.username}</div>
                    {TIMEOUTS.map(([label, mins]) => (
                      <button key={mins} onClick={() => moderate('timeout', mins)} className="flex w-full items-center gap-3 rounded px-2.5 py-1.5 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                        <Clock className="h-4 w-4" /> Timeout {label}
                      </button>
                    ))}
                    <button onClick={() => moderate('kick')} className="flex w-full items-center gap-3 rounded px-2.5 py-1.5 text-left text-sm text-[#F23F43] transition-colors hover:bg-[#F23F43] hover:text-white">
                      <UserX className="h-4 w-4" /> Kick
                    </button>
                    <button onClick={() => moderate('ban')} className="flex w-full items-center gap-3 rounded px-2.5 py-1.5 text-left text-sm text-[#F23F43] transition-colors hover:bg-[#F23F43] hover:text-white">
                      <Ban className="h-4 w-4" /> Ban
                    </button>
                    <div className="px-2.5 pb-1 text-[11px] text-[#949BA4]">Applies here and on the real Discord.</div>
                    <div className="my-1 h-px bg-[#2B2D31]" />
                  </>
                )}
                <button onClick={() => { navigator.clipboard?.writeText(m.content || ''); setMore(false); }} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                  <Copy className="h-4 w-4" /> Copy Text
                </button>
                {mine && !m.source && (
                  <button onClick={() => { setMore(false); setDraft(m.content); setEditing(true); }} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                    <Pencil className="h-4 w-4" /> Edit Message
                  </button>
                )}
                {(mine || can.manageMessages) && (
                  <button onClick={() => { setMore(false); remove(); }} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#F23F43] transition-colors hover:bg-[#F23F43] hover:text-white">
                    <Trash2 className="h-4 w-4" /> Delete Message
                  </button>
                )}
              </div>
            )}
          </div>
          {(mine || can.manageMessages) && <button onClick={remove} className="p-1.5 text-[#F23F43] hover:bg-[#404249]" title="Delete"><Trash2 className="h-5 w-5" /></button>}
        </div>
      )}
    </div>
  );
}

export default function MessageList({ channel, data, state, ctx, actions, onReply, onError, newSinceId }) {
  const scroller = useRef(null);
  const atBottom = useRef(true);
  const prevHeight = useRef(0);
  const loadingOlder = useRef(false);
  const settledChannel = useRef(null);
  const [showJump, setShowJump] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set()); // blocked messages the viewer chose to show
  const list = data?.list || [];
  const can = channel?.can || {};

  // Stick to bottom when new messages arrive and we were already there.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (loadingOlder.current) {
      el.scrollTop = el.scrollHeight - prevHeight.current; // keep position after prepending history
      loadingOlder.current = false;
    } else if (atBottom.current) {
      const last = list[list.length - 1];
      // First paint of a channel jumps; later arrivals glide.
      const smooth = settledChannel.current === channel?.id && last && !last.pending;
      if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      else el.scrollTop = el.scrollHeight;
      if (data?.loaded) settledChannel.current = channel?.id;
    }
  }, [list.length, list[list.length - 1]?.id]);

  useEffect(() => { atBottom.current = true; setShowJump(false); }, [channel?.id]);

  // Images, videos and cards finish loading after the first paint and grow
  // the list; if you were at the bottom, stay there (Discord does the same).
  const content = useRef(null);
  useEffect(() => {
    const el = scroller.current;
    const inner = content.current;
    if (!el || !inner || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => { if (atBottom.current && !loadingOlder.current) el.scrollTop = el.scrollHeight; });
    ro.observe(inner);
    return () => ro.disconnect();
  }, [channel?.id]);

  const onScroll = () => {
    const el = scroller.current;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = dist < 80;
    setShowJump(dist > 600);
    if (el.scrollTop < 200 && data?.hasMore && !data.loading && !loadingOlder.current) {
      loadingOlder.current = true;
      prevHeight.current = el.scrollHeight;
      actions.loadOlder(channel.id).catch(() => { loadingOlder.current = false; });
    }
  };

  const jumpTo = (id) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setHighlightId(id);
      setTimeout(() => setHighlightId(null), 1600);
    }
  };

  const rows = useMemo(() => {
    const out = [];
    let prev = null;
    let newShown = false;
    const blocked = new Set(state.me?.blockedUserIds || []);
    for (const m of list) {
      if (blocked.has(m.author?.id) && !revealed.has(m.id)) {
        const last = out[out.length - 1];
        if (last?.kind === 'blocked') last.ids.push(m.id);
        else out.push({ kind: 'blocked', key: `blk-${m.id}`, ids: [m.id] });
        continue;
      }
      const t = new Date(m.createdAt);
      if (!prev || !isSameDay(new Date(prev.createdAt), t)) out.push({ kind: 'day', key: `day-${m.id}`, t });
      let isNew = false;
      if (!newShown && newSinceId && !m.pending && m.id > newSinceId && m.author?.id !== state.me?.id) {
        out.push({ kind: 'new', key: `new-${m.id}` });
        newShown = isNew = true;
      }
      const grouped = !!prev && !isNew && !m.replyTo && prev.author?.id === m.author?.id && t - new Date(prev.createdAt) < GROUP_MS && isSameDay(new Date(prev.createdAt), t) && !!prev.source === !!m.source;
      out.push({ kind: 'msg', key: m.nonce || m.id, m, grouped });
      prev = m;
    }
    return out;
  }, [list, newSinceId, state.me?.id, state.me?.blockedUserIds, revealed]);

  const fullCtx = { ...ctx, jumpTo };

  return (
    <div className="relative min-h-0 flex-1">
      <ImageViewerHost />
      <div key={channel?.id} ref={scroller} onScroll={onScroll} className="chat-fade-in h-full overflow-y-auto overflow-x-hidden pb-4 [scrollbar-width:thin]">
       <div ref={content}>
        {data?.loaded && !data.hasMore && (
          <div className="px-4 pb-2 pt-12">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[#41434A] text-4xl text-white">#</div>
            <h1 className="text-[28px] font-bold text-white">Welcome to #{channel?.name}!</h1>
            <p className="text-[#B5BAC1]">This is the start of the #{channel?.name} channel.{channel?.topic ? ` ${channel.topic}` : ''}</p>
          </div>
        )}
        {!data?.loaded && <MessageSkeleton />}
        {data?.loaded && data.loading && (
          <div className="flex justify-center py-4 text-[#949BA4]"><Loader2 className="h-5 w-5 animate-spin" /></div>
        )}
        {channel && !channel.can?.readHistory && (
          <div className="px-4 py-6 text-sm text-[#949BA4]">You can see new messages here, but not the channel's history.</div>
        )}
        {rows.map((r) =>
          r.kind === 'day' ? (
            <div key={r.key} className="mx-4 mt-6 flex items-center">
              <div className="h-px flex-1 bg-[#3F4147]" />
              <span className="px-2 text-xs font-semibold text-[#949BA4]">{format(r.t, 'MMMM d, yyyy')}</span>
              <div className="h-px flex-1 bg-[#3F4147]" />
            </div>
          ) : r.kind === 'blocked' ? (
            <div key={r.key} className="mx-4 mt-2 flex items-center gap-2 text-sm text-[#949BA4]">
              <span>{r.ids.length} blocked message{r.ids.length === 1 ? '' : 's'} —</span>
              <button onClick={() => setRevealed((s) => new Set([...s, ...r.ids]))} className="text-[#00A8FC] hover:underline">Show</button>
            </div>
          ) : r.kind === 'new' ? (
            <div key={r.key} className="chat-fade-in relative mx-4 mt-3 flex items-center">
              <div className="h-px flex-1 bg-[#F23F43]" />
              <span className="absolute right-0 rounded-sm bg-[#F23F43] px-1 text-[10px] font-bold uppercase leading-4 text-white">new</span>
            </div>
          ) : (
            <MessageItem
              key={r.key}
              m={r.m}
              grouped={r.grouped}
              ctx={fullCtx}
              me={state.me}
              can={can}
              isStaff={state.me?.isStaff}
              onReply={onReply}
              actions={actions}
              onError={onError}
              highlight={highlightId === r.m.id}
            />
          )
        )}
       </div>
      </div>
      {showJump && (
        <button
          onClick={() => { const el = scroller.current; el.scrollTop = el.scrollHeight; }}
          className="chat-fade-up absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#5865F2] px-4 py-1.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-[#4752C4]"
        >
          Jump to present <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
