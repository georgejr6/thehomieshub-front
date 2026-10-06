import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { PlusCircle, X, FileText, Film, Loader2, Upload, BarChart3, CalendarDays, Gift, Megaphone, Coins, Sparkles, Banknote, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';
import { PollDialog, EventDialog } from './CreateDialogs';
import EmojiPicker from './EmojiPicker';
import { fileKind, formatBytes, renamePasted, validateFiles } from './attachments';

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

// Attachment thumbnail. One object URL per file, revoked on removal — making
// it inline in render leaked a new blob URL (and reloaded the <img>) on every
// keystroke while a file was attached.
function FileThumb({ file }) {
  const [url, setUrl] = useState(null);
  const kind = fileKind(file);
  useEffect(() => {
    if (kind !== 'image' && kind !== 'video') return undefined;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file, kind]);
  if (kind === 'video') {
    return (
      <span className="relative flex max-h-[80px] max-w-full items-center justify-center">
        {url && <video src={url} muted playsInline preload="metadata" className="max-h-[80px] max-w-full rounded object-contain" />}
        <Film className="absolute h-6 w-6 text-white drop-shadow" />
      </span>
    );
  }
  if (kind !== 'image') return <FileText className="h-10 w-10 text-[#B5BAC1]" />;
  return url ? <img src={url} alt="" className="max-h-[80px] max-w-full rounded object-contain" /> : null;
}

let entrySeq = 0;
const toEntries = (list) => list.map((file) => ({ id: `f${(entrySeq += 1)}`, file }));

// Draft highlighting: a mention that will REALLY ping gets the pill it'll
// have once sent (ChatMarkdown) and flashes once as it becomes valid, so you
// know before you hit Enter. @everyone/@here only when you're allowed to use
// them; @name only once it matches a real member (picked from the list, or
// typed and resolved). The textarea's text goes transparent over a mirror
// div that renders the coloured text, only while the draft contains one.
const EVERYONE_RE = /(^|\s)(@(?:everyone|here))(?![\w])/g;
// A typed "@name": 2-32 chars of [\w.], never ending in "." (that's the
// sentence's full stop), followed by space, punctuation or the end.
const TYPED_MENTION_RE = /(^|\s)@([\w.]{1,31}\w)(?![\w]|\.[\w])/g;
function highlightParts(text, mentionTokens, everyoneOk) {
  const marks = [];
  let m;
  if (everyoneOk) {
    EVERYONE_RE.lastIndex = 0;
    while ((m = EVERYONE_RE.exec(text))) marks.push([m.index + m[1].length, m[2].length, 'everyone']);
  }
  for (const token of mentionTokens) {
    let i = text.indexOf(token);
    while (i !== -1) {
      const end = i + token.length;
      // Same boundary rule as send(): not followed by a word char or ".word".
      const next = text.slice(end, end + 2);
      if ((i === 0 || /\s/.test(text[i - 1])) && !/^[\w]|^\.[\w]/.test(next)) marks.push([i, token.length, 'user']);
      i = text.indexOf(token, end);
    }
  }
  if (!marks.length) return null;
  marks.sort((a, b) => a[0] - b[0]);
  const out = [];
  const seen = {};
  let at = 0;
  for (const [start, len, kind] of marks) {
    if (start < at) continue;
    if (start > at) out.push(text.slice(at, start));
    const word = text.slice(start, start + len);
    // Key by the word + its occurrence (not its position) so typing earlier
    // in the draft doesn't replay the flash.
    seen[word] = (seen[word] || 0) + 1;
    out.push(
      <span key={`${word}#${seen[word]}`}
        className={cn('rounded', kind === 'everyone' ? 'chat-everyone-pop bg-[#F0B94D]/20 text-[#F6D48E]' : 'chat-mention-pop bg-[#5865F2]/20 text-[#C9CDFB]')}>
        {word}
      </span>
    );
    at = start + len;
  }
  out.push(text.slice(at));
  return out;
}

// Members already in memory whose username / display name / Discord name
// matches what's typed after "@". Exact > prefix > word-prefix > anywhere
// (same ranking as the mobile app). A bare "@" leaves it to the server,
// which lists the most recently active people.
function localMemberHits(users, q, meId) {
  const scored = [];
  for (const u of users) {
    if (!u?.id || !u.username || u.bot || u.isBot || u.id === meId) continue;
    const names = [u.username, u.displayName, u.discordUsername].filter(Boolean).map((x) => String(x).toLowerCase());
    let score = 0;
    if (!q) continue;
    if (names.includes(q)) score = 4;
    else if (names.some((x) => x.startsWith(q))) score = 3;
    else if (names.some((x) => x.split(/[\s._-]/).some((w) => w.startsWith(q)))) score = 2;
    else if (names.some((x) => x.includes(q))) score = 1;
    if (score) scored.push([score, u]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 8).map(([, u]) => u);
}

function typingText(names) {
  if (!names.length) return '';
  if (names.length === 1) return <><b>{names[0]}</b> is typing…</>;
  if (names.length === 2) return <><b>{names[0]}</b> and <b>{names[1]}</b> are typing…</>;
  if (names.length === 3) return <><b>{names[0]}</b>, <b>{names[1]}</b> and <b>{names[2]}</b> are typing…</>;
  return 'Several people are typing…';
}

const Composer = forwardRef(function Composer({ channel, state, actions, replyTo, clearReply, onError, onEditLast, canCreatePosts, onOpenPerks, onSendMoney }, ref) {
  const [text, setText] = useState('');
  const [emojiAt, setEmojiAt] = useState(null); // emoji picker anchor
  const [files, setFiles] = useState([]); // [{ id, file }]
  const [progress, setProgress] = useState(null);
  const [mention, setMention] = useState(null); // { query, start, results, index }
  const [uploading, setUploading] = useState(0); // files in the current upload
  const [plusMenu, setPlusMenu] = useState(false);
  const [dialog, setDialog] = useState(null); // 'poll' | 'event'
  const [cmdIndex, setCmdIndex] = useState(0);
  const mentionMap = useRef({}); // "@username" (as typed) -> userId
  const resolved = useRef({}); // lowercase name -> userId | null (typed @names looked up)
  const resolveTimer = useRef(null);
  const [, rerender] = useState(0);
  const lastTyping = useRef(0);
  const mentionReq = useRef(0);
  const input = useRef(null);
  const fileInput = useRef(null);
  const mirror = useRef(null);
  const can = channel?.can || {};
  const mutedUntil = state.me?.mutedUntil && new Date(state.me.mutedUntil) > new Date() ? new Date(state.me.mutedUntil) : null;
  const disabled = !can.send || !!mutedUntil;

  // Drafts are per channel, like Discord. Mentions in a restored draft are
  // re-resolved so they still ping (the name → id map lives in memory only).
  useEffect(() => {
    let draft = '';
    try { draft = localStorage.getItem(`hh_chat_draft_${channel?.id}`) || ''; } catch { /* private mode */ }
    setText(draft);
    mentionMap.current = {};
    if (draft) resolveTyped(draft);
    setFiles([]);
    setMention(null);
    if (!disabled) input.current?.focus();
  }, [channel?.id]); // eslint-disable-line
  useEffect(() => () => clearTimeout(resolveTimer.current), []);
  // Keep the highlight mirror scrolled with the textarea (it mounts late).
  useLayoutEffect(() => {
    if (mirror.current && input.current) mirror.current.scrollTop = input.current.scrollTop;
  });
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

  // Drop (anywhere in the channel), paste and the file picker all land here.
  const filesRef = useRef(files);
  filesRef.current = files;
  const channelIdRef = useRef(channel?.id);
  channelIdRef.current = channel?.id;
  const addFiles = (list) => {
    if (disabled || !can.attach) return onError('You can\'t upload files in this channel.');
    const { accepted, error } = validateFiles(Array.from(list || []), {
      current: filesRef.current.length,
      maxBytes: state.me?.uploadMaxBytes === null ? null : state.me?.uploadMaxBytes,
    });
    if (error) onError(error);
    if (!accepted.length) return undefined;
    const next = [...filesRef.current, ...toEntries(accepted)];
    filesRef.current = next;
    setFiles(next);
    if (window.matchMedia?.('(hover: hover)').matches) input.current?.focus();
    return undefined;
  };
  useImperativeHandle(ref, () => ({ addFiles }));
  const removeFile = (id) => {
    setFiles((cur) => cur.filter((e) => e.id !== id));
    input.current?.focus();
  };

  // Ctrl+V a screenshot / copied image. Plain text (even when the clipboard
  // also carries a file icon, e.g. from Office) pastes as text.
  const onPaste = (e) => {
    const dt = e.clipboardData;
    if (!dt) return;
    let pasted = Array.from(dt.files || []);
    if (!pasted.length && dt.items) pasted = Array.from(dt.items).filter((it) => it.kind === 'file').map((it) => it.getAsFile()).filter(Boolean);
    if (!pasted.length) return;
    const types = Array.from(dt.types || []);
    if (types.includes('text/plain') && dt.getData('text/plain')) return;
    e.preventDefault();
    addFiles(pasted.map((f) => renamePasted(f)));
  };

  // A typed "@name" (not picked from the list) still counts once it matches a
  // real member exactly — by username, as Discord does. Known members resolve
  // instantly; others with one debounced lookup, cached.
  const resolveTyped = (v) => {
    const pending = [];
    let changed = false;
    for (const [, , name] of v.matchAll(TYPED_MENTION_RE)) {
      const token = `@${name}`;
      const lower = name.toLowerCase();
      if (mentionMap.current[token] || lower === 'everyone' || lower === 'here') continue;
      const known = Object.values(state.users || {}).find((u) => u?.username?.toLowerCase() === lower);
      const id = known?.id || resolved.current[lower];
      if (id) { mentionMap.current[token] = id; changed = true; } else if (!(lower in resolved.current)) pending.push(lower);
    }
    if (changed) rerender((n) => n + 1);
    if (!pending.length) return;
    clearTimeout(resolveTimer.current);
    resolveTimer.current = setTimeout(async () => {
      for (const lower of pending.slice(0, 5)) {
        if (lower in resolved.current) continue;
        const res = await actions.searchMembers(lower).catch(() => null);
        if (!res) continue;
        const id = res.find((u) => u.username?.toLowerCase() === lower)?.id;
        // Only remember a miss when the lookup wasn't cut off by its limit —
        // a full page may simply not include the exact name.
        if (id || res.length < 8) resolved.current[lower] = id || null;
      }
      const cur = input.current?.value || '';
      let hit = false;
      for (const [, , name] of cur.matchAll(TYPED_MENTION_RE)) {
        const id = resolved.current[name.toLowerCase()];
        if (id && !mentionMap.current[`@${name}`]) { mentionMap.current[`@${name}`] = id; hit = true; }
      }
      if (hit) rerender((n) => n + 1);
    }, 350);
  };

  // Emoji picker → insert at the cursor (or the end), keep typing after it.
  const caretRef = useRef(null);
  const insertEmoji = (emoji) => {
    const el = input.current;
    const cur = el?.value ?? text;
    const [a, b] = caretRef.current || [cur.length, cur.length];
    if (cur.length - (b - a) + emoji.length > 4000) return;
    const next = `${cur.slice(0, a)}${emoji}${cur.slice(b)}`;
    setText(next);
    setMention(null);
    resolveTyped(next);
    const at = Math.min(next.length, a + emoji.length);
    caretRef.current = [at, at];
    // Phones: don't pop the keyboard up over the chat after every pick.
    if (window.matchMedia?.('(hover: hover)').matches) setTimeout(() => { el?.focus(); el?.setSelectionRange(at, at); }, 0);
  };

  // "Mention" on a member card drops @username into the draft.
  useEffect(() => {
    const on = (e) => {
      const { id, username } = e.detail || {};
      if (!id || !username || disabled) return;
      const token = `@${username}`;
      mentionMap.current[token] = id;
      setText((t) => `${t}${t && !/\s$/.test(t) ? ' ' : ''}${token} `);
      setTimeout(() => { const el = input.current; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 0);
    };
    window.addEventListener('hh:chat-mention', on);
    return () => window.removeEventListener('hh:chat-mention', on);
  }, [disabled]);

  const onChange = async (e) => {
    const v = e.target.value;
    setText(v);
    resolveTyped(v);
    if (Date.now() - lastTyping.current > 3000 && v.trim()) {
      lastTyping.current = Date.now();
      actions.typing(channel.id);
    }
    const caret = e.target.selectionStart;
    const m = v.slice(0, caret).match(/(^|\s)@([\w.]{0,32})$/);
    const req = ++mentionReq.current;
    if (m) {
      const query = m[2];
      const start = caret - query.length - 1;
      // @everyone / @here first, only for people allowed to use them.
      const q = query.toLowerCase();
      const special = can.mentionEveryone
        ? [['everyone', 'Notify everyone who can see this channel'], ['here', 'Notify everyone online right now']]
            .filter(([w]) => w.startsWith(q))
            .map(([w, desc]) => ({ id: `@${w}`, special: true, username: w, displayName: `@${w}`, desc }))
        : [];
      // Open the picker on THIS keystroke from people already loaded (chat
      // authors + member list), so you can confirm who you're tagging while
      // still typing; the server search then fills in everyone else.
      const local = localMemberHits(Object.values(state.users || {}), q, state.me?.id);
      setMention({ query, start, results: [...special, ...local].slice(0, 10), index: 0 });
      await new Promise((r) => setTimeout(r, 120)); // debounce: one search per pause, not per key
      if (req !== mentionReq.current) return;
      const results = await actions.searchMembers(query).catch(() => []);
      // Only the latest keystroke's search may update the picker — an older,
      // slower response would otherwise reopen it after you moved on/sent.
      if (req !== mentionReq.current) return;
      const seen = new Set();
      const merged = [...special, ...local, ...results].filter((u) => u?.id && u.id !== state.me?.id && !seen.has(u.id) && seen.add(u.id));
      // Picked / dismissed (Esc, emoji, send) while the search was out → stay closed.
      setMention((cur) => (cur && cur.start === start && cur.query === query
        ? { query, start, results: merged.slice(0, 10), index: Math.min(cur.index, Math.max(merged.length - 1, 0)) }
        : cur));
    } else setMention(null);
  };

  const pickMention = (u) => {
    mentionReq.current += 1; // a search still in flight must not reopen the picker
    const before = text.slice(0, mention.start);
    const after = text.slice(mention.start + 1 + mention.query.length);
    const token = `@${u.username}`;
    if (!u.special) mentionMap.current[token] = u.id;
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
    // Visible "@username" → wire format "<@id>" (whole words only, longest
    // first, so "@bob" never eats the start of "@bobby"); :shortcodes: → emoji.
    // A trailing "." ends the sentence, it isn't part of the name ("hi @bob.").
    const tokens = Object.entries(mentionMap.current).sort((a, b) => b[0].length - a[0].length);
    for (const [token, id] of tokens) {
      const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      content = content.replace(new RegExp(`(^|\\s)${esc}(?![\\w]|\\.[\\w])`, 'g'), `$1<@${id}>`);
    }
    content = content.replace(/:([\w+]+):/g, (all, code) => SHORTCODES[code] || all);
    const toUpload = files;
    const sentFrom = channel.id;
    const reply = replyTo;
    mentionReq.current += 1;
    setMention(null);
    setText('');
    setFiles([]);
    clearReply();
    mentionMap.current = {};
    let attachments;
    if (toUpload.length) {
      try {
        setProgress(0);
        setUploading(toUpload.length);
        attachments = await actions.uploadFiles(channel.id, toUpload.map((e) => e.file), setProgress);
      } catch (err) {
        setProgress(null);
        setUploading(0);
        setText(text);
        resolveTyped(text); // the mention map was cleared for the send
        // Back into the tray — unless you've moved to another channel since.
        if (channelIdRef.current === sentFrom) setFiles((cur) => [...toUpload, ...cur].slice(0, 10));
        return onError(err.response?.data?.message || 'Upload failed.');
      }
      setProgress(null);
      setUploading(0);
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

  const highlighted = highlightParts(text, Object.keys(mentionMap.current), !!can.mentionEveryone);
  if (!channel) return null;
  const placeholder = mutedUntil
    ? `You're timed out until ${mutedUntil.toLocaleTimeString()}`
    : !can.send
      ? 'You do not have permission to send messages in this channel.'
      : `Message ${channel.type === 'thread' ? '' : '#'}${channel.name}`;

  return (
    <div className="relative shrink-0 px-4 pb-6">

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
              {u.special ? (
                <>
                  <span className="font-semibold text-[#F6D48E]">{u.displayName}</span>
                  <span className="truncate text-sm text-[#949BA4]">{u.desc}</span>
                </>
              ) : (
                <>
                  {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#5865F2] text-[11px] font-semibold text-white">{(u.displayName || '?')[0].toUpperCase()}</span>}
                  <span className="truncate font-medium" style={{ color: u.color ? roleColor(u.color) : '#F2F3F5' }}>{u.displayName}</span>
                  <span className="shrink-0 text-sm text-[#949BA4]">{u.username}</span>
                  {u.discordUsername && u.discordUsername !== u.username && (
                    <span className="ml-auto hidden truncate text-xs text-[#6D6F78] sm:block">Discord: {u.discordUsername}</span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {replyTo && (
        <div className="chat-fade-up flex items-center justify-between rounded-t-lg bg-[#2B2D31] px-4 py-2 text-sm text-[#B5BAC1]">
          <span>Replying to <b style={{ color: replyTo.author?.color ? roleColor(replyTo.author.color) : '#F2F3F5' }}>{replyTo.author?.displayName}</b></span>
          <button onClick={clearReply} aria-label="Cancel reply" className="group -m-2 p-2"><span className="block rounded-full bg-[#B5BAC1] p-0.5 text-[#2B2D31] group-hover:bg-white"><X className="h-3 w-3" /></span></button>
        </div>
      )}

      <div className={cn('rounded-lg bg-[#383A40]', replyTo && 'rounded-t-none')}>
        {files.length > 0 && (
          <ul aria-label="Attachments" className="flex gap-3 overflow-x-auto border-b border-[#2B2D31] p-3 pt-4">
            {files.map(({ id, file: f }) => (
              <li key={id} className="chat-pop relative flex h-[120px] w-[120px] shrink-0 flex-col items-center justify-center rounded bg-[#2B2D31] p-2">
                <FileThumb file={f} />
                <div className="mt-1 w-full truncate text-center text-xs text-[#DBDEE1]" title={f.name}>{f.name}</div>
                <div className="text-[10px] text-[#949BA4]">{formatBytes(f.size)}</div>
                <button type="button" onClick={() => removeFile(id)} aria-label={`Remove ${f.name}`} title="Remove"
                  className="absolute -right-2 -top-2 rounded bg-[#2B2D31] p-1.5 text-[#F23F43] shadow hover:bg-[#404249] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
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
              {onSendMoney && (
                <>
                  <div className="mx-2 my-1 h-px bg-white/10" />
                  <button onClick={() => { setPlusMenu(false); onSendMoney(); }} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#23A55A] hover:text-white">
                    <Banknote className="h-5 w-5" /> Send Money
                  </button>
                </>
              )}
            </div>
          )}
          <button
            disabled={disabled}
            onClick={(e) => { e.stopPropagation(); setPlusMenu((v) => !v); }}
            title="Upload a file, create a poll or event, or send money"
            className={cn('px-4 py-[11px] transition-[color,transform] duration-200 hover:text-[#DBDEE1] disabled:opacity-30', plusMenu ? 'rotate-45 text-[#DBDEE1]' : 'text-[#B5BAC1]')}
          >
            {progress !== null ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlusCircle className="h-6 w-6" />}
          </button>
          <input ref={fileInput} data-chat-file-input type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          <div className="relative min-w-0 flex-1">
          {highlighted && (
            <div ref={mirror} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words py-[11px] pr-2 text-[15px] leading-[1.375rem] text-[#DBDEE1]">
              {highlighted}{'​'}
            </div>
          )}
          <textarea
            ref={input}
            onScroll={(e) => { if (mirror.current) mirror.current.scrollTop = e.currentTarget.scrollTop; }}
            value={text}
            disabled={disabled}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={placeholder}
            rows={1}
            maxLength={4000}
            className={cn('relative block max-h-[50vh] w-full resize-none break-words bg-transparent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-[11px] pr-2 text-[15px] leading-[1.375rem] placeholder-[#6D6F78] outline-none disabled:cursor-not-allowed', highlighted ? 'text-transparent caret-[#DBDEE1]' : 'text-[#DBDEE1]')}
          />
          </div>
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              const el = input.current;
              caretRef.current = el && document.activeElement === el ? [el.selectionStart, el.selectionEnd] : null;
              // Phones: drop the keyboard so it doesn't cover the emoji sheet.
              if (!window.matchMedia?.('(hover: hover)').matches) el?.blur();
              setEmojiAt(e.currentTarget.getBoundingClientRect());
            }}
            title="Emoji"
            aria-label="Emoji"
            className="group py-[11px] pl-2 pr-1 text-[#B5BAC1] transition-colors hover:text-[#F0B232] disabled:opacity-30 sm:px-2"
          >
            <Smile className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
          </button>
          {emojiAt && <EmojiPicker anchor={emojiAt} onPick={insertEmoji} onClose={() => setEmojiAt(null)} />}
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
          <div role="progressbar" aria-label={`Uploading ${uploading} file${uploading === 1 ? '' : 's'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="px-4 pb-1 text-xs text-[#B5BAC1]">Uploading {uploading} file{uploading === 1 ? '' : 's'}… {Math.round(progress * 100)}%</div>
            <div className="h-1 overflow-hidden rounded-b-lg bg-[#2B2D31]"><div className="h-full bg-[#5865F2] transition-[width] duration-200 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          </div>
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
});

export default Composer;
