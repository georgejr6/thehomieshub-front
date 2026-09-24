import React, { useEffect, useRef, useState } from 'react';
import { PlusCircle, X, FileText, Loader2, Upload, BarChart3, CalendarDays, Gift, Megaphone, Coins, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';
import { PollDialog, EventDialog } from './CreateDialogs';

const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;
const SHORTCODES = {
  fire: '🔥', joy: '😂', heart: '❤️', '100': '💯', pray: '🙏', skull: '💀', eyes: '👀', tada: '🎉', thumbsup: '👍', '+1': '👍',
  sob: '😭', smile: '😄', wave: '👋', clap: '👏', rofl: '🤣', thinking: '🤔', muscle: '💪', crown: '👑', money: '💰', cap: '🧢',
};

// Slash commands for Homies Points (they open the points sheet prefilled).
const COMMANDS = [
  { name: 'gift', icon: Gift, hint: '@member', desc: 'Gift someone a Homies membership' },
  { name: 'shoutout', icon: Megaphone, hint: 'points message', desc: 'Pin a highlighted message to the channel' },
  { name: 'redeem', icon: Sparkles, hint: '', desc: 'Get membership for yourself with points' },
  { name: 'points', icon: Coins, hint: '', desc: 'Your balance · buy points' },
];

function typingText(names) {
  if (!names.length) return '';
  if (names.length === 1) return <><b>{names[0]}</b> is typing…</>;
  if (names.length === 2) return <><b>{names[0]}</b> and <b>{names[1]}</b> are typing…</>;
  if (names.length === 3) return <><b>{names[0]}</b>, <b>{names[1]}</b> and <b>{names[2]}</b> are typing…</>;
  return 'Several people are typing…';
}

export default function Composer({ channel, state, actions, replyTo, clearReply, onError, onEditLast, canCreatePosts, onOpenPerks }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(null);
  const [mention, setMention] = useState(null); // { query, start, results, index }
  const [dragging, setDragging] = useState(false);
  const [plusMenu, setPlusMenu] = useState(false);
  const [dialog, setDialog] = useState(null); // 'poll' | 'event'
  const [cmdIndex, setCmdIndex] = useState(0);
  const mentionMap = useRef({}); // "@username" -> userId
  const lastTyping = useRef(0);
  const input = useRef(null);
  const fileInput = useRef(null);
  const can = channel?.can || {};
  const mutedUntil = state.me?.mutedUntil && new Date(state.me.mutedUntil) > new Date() ? new Date(state.me.mutedUntil) : null;
  const disabled = !can.send || !!mutedUntil;

  // Drafts are per channel, like Discord.
  useEffect(() => {
    try { setText(localStorage.getItem(`hh_chat_draft_${channel?.id}`) || ''); } catch { setText(''); }
    setFiles([]);
    setMention(null);
    if (!disabled) input.current?.focus();
  }, [channel?.id]); // eslint-disable-line
  useEffect(() => {
    try { localStorage.setItem(`hh_chat_draft_${channel?.id}`, text); } catch { /* private mode */ }
  }, [text, channel?.id]);
  useEffect(() => { if (replyTo) input.current?.focus(); }, [replyTo]);

  // Auto-grow up to ~50% of the viewport.
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.5)}px`;
  }, [text]);

  const addFiles = (list) => {
    if (!can.attach) return onError('You can\'t upload files in this channel.');
    const incoming = [...list];
    const tooBig = incoming.find((f) => f.size > MAX_BYTES);
    if (tooBig) return onError(`${tooBig.name} is over 25 MB.`);
    setFiles((cur) => [...cur, ...incoming].slice(0, MAX_FILES));
  };

  const onChange = async (e) => {
    const v = e.target.value;
    setText(v);
    if (Date.now() - lastTyping.current > 3000 && v.trim()) {
      lastTyping.current = Date.now();
      actions.typing(channel.id);
    }
    const caret = e.target.selectionStart;
    const m = v.slice(0, caret).match(/(^|\s)@([\w.]{0,32})$/);
    if (m) {
      const query = m[2];
      const start = caret - query.length - 1;
      const results = await actions.searchMembers(query).catch(() => []);
      setMention({ query, start, results: results.slice(0, 8), index: 0 });
    } else setMention(null);
  };

  const pickMention = (u) => {
    const before = text.slice(0, mention.start);
    const after = text.slice(mention.start + 1 + mention.query.length);
    const token = `@${u.username}`;
    mentionMap.current[token] = u.id;
    setText(`${before}${token} ${after}`);
    setMention(null);
    input.current?.focus();
  };

  // "/gift @name", "/shoutout 500 message", "/redeem", "/points"
  const cmdMatch = text.match(/^\/(\w*)$/);
  const cmdOptions = cmdMatch && onOpenPerks ? COMMANDS.filter((c) => c.name.startsWith(cmdMatch[1].toLowerCase())) : [];
  const runCommand = (raw) => {
    const m = raw.trim().match(/^\/(gift|shoutout|redeem|points)(?:\s+(.*))?$/is);
    if (!m || !onOpenPerks) return false;
    const [, cmd, rest = ''] = m;
    const name = cmd.toLowerCase();
    setText('');
    if (name === 'gift') {
      const token = rest.trim().split(/\s+/)[0] || '';
      const id = mentionMap.current[token];
      const known = id && Object.values(state.users || {}).find((u) => u.id === id);
      onOpenPerks({ tab: 'gift', gift: { self: false, to: known || null, query: known ? '' : token.replace(/^@/, '') } });
    } else if (name === 'shoutout') {
      const sm = rest.match(/^(\d[\d,]*)\s*(.*)$/s);
      onOpenPerks({ tab: 'shoutout', shoutout: sm ? { points: Number(sm[1].replace(/,/g, '')), message: sm[2].slice(0, 300) } : { message: rest.slice(0, 300) } });
    } else if (name === 'redeem') onOpenPerks({ tab: 'gift', gift: { self: true } });
    else onOpenPerks({ tab: 'points' });
    mentionMap.current = {};
    return true;
  };
  const pickCommand = (c) => {
    if (c.hint) { setText(`/${c.name} `); input.current?.focus(); } else runCommand(`/${c.name}`);
  };

  const send = async () => {
    if (runCommand(text)) return;
    let content = text.trim();
    if ((!content && !files.length) || disabled || progress !== null) return;
    // Visible "@username" → wire format "<@id>"; :shortcodes: → emoji.
    for (const [token, id] of Object.entries(mentionMap.current)) {
      content = content.split(token).join(`<@${id}>`);
    }
    content = content.replace(/:([\w+]+):/g, (all, code) => SHORTCODES[code] || all);
    const toUpload = files;
    const reply = replyTo;
    setText('');
    setFiles([]);
    clearReply();
    mentionMap.current = {};
    let attachments;
    if (toUpload.length) {
      try {
        setProgress(0);
        attachments = await actions.uploadFiles(channel.id, toUpload, setProgress);
      } catch (err) {
        setProgress(null);
        setText(text);
        setFiles(toUpload);
        return onError(err.response?.data?.message || 'Upload failed.');
      }
      setProgress(null);
    }
    const res = await actions.sendMessage({ channelId: channel.id, content, attachments, replyTo: reply });
    if (res.error) onError(res.error.message);
  };

  useEffect(() => {
    if (!plusMenu) return undefined;
    const close = () => setPlusMenu(false);
    setTimeout(() => window.addEventListener('click', close), 0);
    return () => window.removeEventListener('click', close);
  }, [plusMenu]);

  // Polls/events are real Homies posts (they also show in the app), shared
  // into this channel as a live card.
  const createAndShare = (kind) => async (body) => {
    const post = await actions.createPost(kind, body);
    const res = await actions.sendMessage({ channelId: channel.id, content: '', postId: post._id });
    if (res.error) onError(res.error.message);
  };
  const openCreate = (kind) => {
    setPlusMenu(false);
    if (!canCreatePosts) return onError(`Creating ${kind === 'poll' ? 'polls' : 'events'} is for Homies members. Upgrade your membership to unlock it.`);
    setDialog(kind);
  };

  const onKeyDown = (e) => {
    if (cmdOptions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCmdIndex((i) => (i + 1) % cmdOptions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCmdIndex((i) => (i - 1 + cmdOptions.length) % cmdOptions.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickCommand(cmdOptions[cmdIndex % cmdOptions.length]); return; }
    }
    if (mention?.results?.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMention({ ...mention, index: (mention.index + 1) % mention.results.length }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMention({ ...mention, index: (mention.index - 1 + mention.results.length) % mention.results.length }); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(mention.results[mention.index]); return; }
      if (e.key === 'Escape') { setMention(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
    if (e.key === 'Escape' && replyTo) clearReply();
    if (e.key === 'ArrowUp' && !text) { e.preventDefault(); onEditLast(); }
  };

  const typers = Object.keys(state.typing[channel?.id] || {})
    .filter((id) => id !== state.me?.id)
    .map((id) => state.users[id]?.displayName || state.users[id]?.username || 'Someone');

  if (!channel) return null;
  const placeholder = mutedUntil
    ? `You're timed out until ${mutedUntil.toLocaleTimeString()}`
    : !can.send
      ? 'You do not have permission to send messages in this channel.'
      : `Message ${channel.type === 'thread' ? '' : '#'}${channel.name}`;

  return (
    <div
      className="relative shrink-0 px-4 pb-6"
      onDragOver={(e) => { if (can.attach && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
    >
      {dragging && (
        <div className="chat-fade-in pointer-events-none absolute inset-x-4 bottom-6 top-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-[#5865F2] bg-[#5865F2]/20 text-white">
          Drop to upload to #{channel.name}
        </div>
      )}

      {cmdOptions.length > 0 && (
        <div className="chat-fade-up absolute bottom-full left-4 right-4 z-30 mb-1 overflow-hidden rounded-lg border border-[#1E1F22] bg-[#2B2D31] py-1 shadow-xl">
          <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase text-[#949BA4]">Homies Points</div>
          {cmdOptions.map((c, i) => (
            <button key={c.name} onMouseDown={(e) => { e.preventDefault(); pickCommand(c); }}
              className={cn('flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-100', i === cmdIndex % cmdOptions.length ? 'bg-[#404249]' : 'hover:bg-[#35373C]')}>
              <c.icon className="h-5 w-5 shrink-0 text-[#F0B94D]" />
              <span className="font-semibold text-white">/{c.name}</span>
              {c.hint && <span className="text-sm text-[#949BA4]">{c.hint}</span>}
              <span className="ml-auto hidden truncate text-sm text-[#949BA4] sm:block">{c.desc}</span>
            </button>
          ))}
        </div>
      )}

      {mention?.results?.length > 0 && (
        <div className="chat-fade-up absolute bottom-full left-4 right-4 z-30 mb-1 overflow-hidden rounded-lg border border-[#1E1F22] bg-[#2B2D31] py-1 shadow-xl">
          <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase text-[#949BA4]">Members</div>
          {mention.results.map((u, i) => (
            <button
              key={u.id}
              onMouseDown={(e) => { e.preventDefault(); pickMention(u); }}
              className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors duration-100', i === mention.index ? 'bg-[#404249]' : 'hover:bg-[#35373C]')}
            >
              <span className="font-medium" style={{ color: u.color ? roleColor(u.color) : '#F2F3F5' }}>{u.displayName}</span>
              <span className="text-sm text-[#949BA4]">{u.username}</span>
            </button>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="chat-fade-up flex items-center justify-between rounded-t-lg bg-[#2B2D31] px-4 py-2 text-sm text-[#B5BAC1]">
          <span>Replying to <b style={{ color: replyTo.author?.color ? roleColor(replyTo.author.color) : '#F2F3F5' }}>{replyTo.author?.displayName}</b></span>
          <button onClick={clearReply} className="rounded-full bg-[#B5BAC1] p-0.5 text-[#2B2D31] hover:bg-white"><X className="h-3 w-3" /></button>
        </div>
      )}

      <div className={cn('rounded-lg bg-[#383A40]', replyTo && 'rounded-t-none')}>
        {files.length > 0 && (
          <div className="flex gap-3 overflow-x-auto border-b border-[#2B2D31] p-3">
            {files.map((f, i) => (
              <div key={`${f.name}-${f.size}-${f.lastModified}`} className="chat-pop relative flex h-[120px] w-[120px] shrink-0 flex-col items-center justify-center rounded bg-[#2B2D31] p-2">
                {f.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(f)} alt="" className="max-h-[80px] max-w-full rounded object-contain" />
                ) : (
                  <FileText className="h-10 w-10 text-[#B5BAC1]" />
                )}
                <div className="mt-1 w-full truncate text-center text-xs text-[#DBDEE1]">{f.name}</div>
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 rounded bg-[#2B2D31] p-1 text-[#F23F43] shadow hover:bg-[#404249]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-start">
          {plusMenu && (
            <div onClick={(e) => e.stopPropagation()} className="chat-fade-up absolute bottom-full left-4 z-30 mb-2 w-56 overflow-hidden rounded-lg border border-[#1E1F22] bg-[#111214] p-1.5 shadow-2xl">
              <button
                disabled={!can.attach}
                onClick={() => { setPlusMenu(false); fileInput.current?.click(); }}
                className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Upload className="h-5 w-5" /> Upload a File
              </button>
              <button onClick={() => openCreate('poll')} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                <BarChart3 className="h-5 w-5" /> Create Poll
              </button>
              <button onClick={() => openCreate('event')} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#5865F2] hover:text-white">
                <CalendarDays className="h-5 w-5" /> Create Event
              </button>
            </div>
          )}
          <button
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); setPlusMenu((v) => !v); }}
            title="Upload a file, create a poll or an event"
            className={cn('px-4 py-[11px] transition-[color,transform] duration-200 hover:text-[#DBDEE1] disabled:opacity-30', plusMenu ? 'rotate-45 text-[#DBDEE1]' : 'text-[#B5BAC1]')}
          >
            {progress !== null ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-6 w-6" />}
          </button>
          <input ref={fileInput} data-chat-file-input type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <textarea
            ref={input}
            value={text}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={(e) => { if (e.clipboardData.files?.length) { e.preventDefault(); addFiles(e.clipboardData.files); } }}
            placeholder={placeholder}
            rows={1}
            maxLength={4000}
            className="max-h-[50vh] flex-1 resize-none bg-transparent py-[11px] pr-2 text-[15px] leading-[1.375rem] text-[#DBDEE1] placeholder-[#6D6F78] outline-none disabled:cursor-not-allowed"
          />
          {onOpenPerks && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOpenPerks({ tab: 'gift' })}
              title="Gift a membership or send a shoutout"
              className="group px-3 py-[11px] text-[#B5BAC1] transition-colors hover:text-[#F0B94D] disabled:opacity-30"
            >
              <Gift className="h-6 w-6 transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110" />
            </button>
          )}
        </div>
        {progress !== null && (
          <div className="h-1 overflow-hidden rounded-b-lg bg-[#2B2D31]"><div className="h-full bg-[#5865F2] transition-[width] duration-200 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        )}
      </div>
      {dialog === 'poll' && <PollDialog onClose={() => setDialog(null)} onCreate={createAndShare('poll')} />}
      {dialog === 'event' && <EventDialog onClose={() => setDialog(null)} onCreate={createAndShare('event')} />}
      <div className="absolute bottom-1 left-4 h-5 truncate text-xs text-[#DBDEE1]">
        {typers.length > 0 && (
          <span className="chat-fade-in flex items-center gap-1.5">
            <span className="inline-flex items-end gap-[3px] pb-0.5">{[0, 1, 2].map((i) => <span key={i} className="chat-typing-dot h-1.5 w-1.5 rounded-full bg-[#DBDEE1]" style={{ animationDelay: `${i * 0.16}s` }} />)}</span>
            {typingText(typers)}
          </span>
        )}
      </div>
    </div>
  );
}
