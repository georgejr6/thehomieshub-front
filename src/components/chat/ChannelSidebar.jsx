import React, { useMemo, useState } from 'react';
import { Hash, Megaphone, MessagesSquare, ChevronDown, CornerDownRight, Home, Settings, Trash2, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';

const ICONS = { text: Hash, announcement: Megaphone, forum: MessagesSquare, thread: CornerDownRight };

function ChannelRow({ c, active, onOpen, muted, depth = 0 }) {
  const Icon = ICONS[c.type] || Hash;
  const unread = c.unread > 0 && !active;
  return (
    <button
      onClick={() => onOpen(c.id)}
      className={cn(
        'group relative mx-2 flex w-[calc(100%-16px)] items-center gap-1.5 rounded px-2 py-[5px] text-left text-[15px] leading-5 transition-colors duration-150 active:scale-[0.99]',
        depth && 'pl-7',
        active ? 'bg-[#404249] text-white' : unread ? 'text-white hover:bg-[#35373C]' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]',
        muted && !active && 'opacity-40'
      )}
    >
      {unread && <span className="chat-pop absolute -left-2 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r bg-white" />}
      <Icon className="h-[18px] w-[18px] shrink-0 opacity-70" />
      <span className={cn('truncate', (unread || active) && 'font-semibold')}>{c.name}</span>
      {c.discoverable && <Globe className="h-3 w-3 shrink-0 opacity-50" title="Posts here can become discoverable Homies posts" />}
      {c.mentions > 0 && !active && (
        <span key={c.mentions} className="chat-pop ml-auto rounded-full bg-[#F23F43] px-1.5 text-[11px] font-bold leading-4 text-white">{c.mentions > 99 ? '99+' : c.mentions}</span>
      )}
    </button>
  );
}

export default function ChannelSidebar({ state, activeChannelId, onOpen, onClose, onDeleteHistory, onToggleDiscoverable }) {
  const [menu, setMenu] = useState(false);
  const activeName = state.channels.find((c) => c.id === activeChannelId)?.name;
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hh_chat_collapsed') || '{}'); } catch { return {}; }
  });
  const toggle = (cat) => {
    const next = { ...collapsed, [cat]: !collapsed[cat] };
    setCollapsed(next);
    try { localStorage.setItem('hh_chat_collapsed', JSON.stringify(next)); } catch { /* private mode */ }
  };

  const mutedIds = new Set(state.me?.notifications?.mutedChannels || []);
  const groups = useMemo(() => {
    const top = state.channels.filter((c) => c.type !== 'thread').sort((a, b) => a.categoryPosition - b.categoryPosition || a.position - b.position);
    const threadsOf = {};
    for (const t of state.channels.filter((c) => c.type === 'thread')) (threadsOf[t.parentId] ||= []).push(t);
    const out = [];
    for (const c of top) {
      let g = out[out.length - 1];
      if (!g || g.name !== c.category) { g = { name: c.category, items: [] }; out.push(g); }
      g.items.push({ c, threads: threadsOf[c.id] || [] });
    }
    return out;
  }, [state.channels]);

  const me = state.me;
  const status = state.status === 'connected' ? 'online' : 'offline';
  return (
    <div className="flex h-full w-60 shrink-0 flex-col bg-[#2B2D31]">
      <div className="flex h-12 shrink-0 items-center border-b border-[#1F2023] px-4 shadow-sm">
        <span className="truncate text-[15px] font-semibold text-white">{state.server?.name || 'The Homies'}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 [scrollbar-width:thin]">
        {groups.map((g) => {
          const isCollapsed = collapsed[g.name];
          return (
            <div key={g.name || '_'} className="mb-1">
              {g.name && (
                <button onClick={() => toggle(g.name)} className="flex w-full items-center gap-0.5 px-1 pb-1 pt-4 text-[12px] font-semibold uppercase tracking-wide text-[#949BA4] transition-colors duration-150 hover:text-[#DBDEE1]">
                  <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', isCollapsed && '-rotate-90')} />
                  <span className="truncate">{g.name}</span>
                </button>
              )}
              {g.items.map(({ c, threads }) => {
                const active = c.id === activeChannelId;
                // Collapsed categories still show the open channel and anything unread (Discord).
                if (isCollapsed && !active && !c.unread && !c.mentions) return null;
                return (
                  <React.Fragment key={c.id}>
                    <ChannelRow c={c} active={active} onOpen={(id) => { onOpen(id); onClose?.(); }} muted={mutedIds.has(c.id)} />
                    {!isCollapsed && threads.map((t) => (
                      <ChannelRow key={t.id} c={t} depth={1} active={t.id === activeChannelId} onOpen={(id) => { onOpen(id); onClose?.(); }} />
                    ))}
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
      {me && (
        <div className="flex h-[52px] shrink-0 items-center gap-2 bg-[#232428] px-2">
          <div className="relative">
            <img src={me.avatarUrl || '/favicon.ico'} alt="" className="h-8 w-8 rounded-full bg-[#5865F2] object-cover" />
            <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#232428] transition-colors duration-300', status === 'online' ? 'bg-[#23A55A]' : 'bg-[#80848E]')} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold" style={{ color: me.color ? roleColor(me.color) : '#F2F3F5' }}>{me.displayName}</div>
            <div className="truncate text-xs text-[#B5BAC1]">{state.status === 'connected' ? 'Online' : state.status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}</div>
          </div>
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} title="Chat settings" className={cn('rounded p-1.5 transition-[color,transform] duration-300 hover:bg-[#3F4147] hover:text-white', menu ? 'rotate-90 text-white' : 'text-[#B5BAC1]')}>
              <Settings className="h-5 w-5" />
            </button>
            {menu && (
              <div className="chat-fade-up absolute bottom-full right-0 z-40 mb-2 w-64 rounded-lg border border-[#1E1F22] bg-[#111214] p-1.5 shadow-2xl" onMouseLeave={() => setMenu(false)}>
                <div className="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase text-[#949BA4]">Privacy</div>
                <button onClick={() => onToggleDiscoverable?.(!(state.me?.chatDiscoverable !== false))} className="flex w-full items-start gap-3 rounded px-2.5 py-2 text-left text-sm text-[#DBDEE1] transition-colors hover:bg-[#35373C]">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">
                    Discoverable posts
                    <span className="block text-xs text-[#949BA4]">Good posts in public channels can become Homies posts anyone can find. You can still choose per message.</span>
                  </span>
                  <span className={cn('mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors', state.me?.chatDiscoverable !== false ? 'bg-[#23A55A]' : 'bg-[#80848E]')}>
                    <span className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform duration-200', state.me?.chatDiscoverable !== false && 'translate-x-4')} />
                  </span>
                </button>
                <div className="my-1 h-px bg-[#2B2D31]" />
                <div className="px-2.5 pb-1 pt-1.5 text-xs font-semibold uppercase text-[#949BA4]">Your messages</div>
                {activeName && (
                  <button onClick={() => { setMenu(false); onDeleteHistory?.(activeChannelId, activeName); }} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#F23F43] transition-colors hover:bg-[#F23F43] hover:text-white">
                    <Trash2 className="h-4 w-4 shrink-0" /> <span className="truncate">Delete my messages in #{activeName}</span>
                  </button>
                )}
                <button onClick={() => { setMenu(false); onDeleteHistory?.(null); }} className="flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-sm text-[#F23F43] transition-colors hover:bg-[#F23F43] hover:text-white">
                  <Trash2 className="h-4 w-4 shrink-0" /> Delete all my chat messages
                </button>
              </div>
            )}
          </div>
          <Link to="/" title="Back to The Homies" className="rounded p-1.5 text-[#B5BAC1] transition-colors hover:bg-[#3F4147] hover:text-white">
            <Home className="h-5 w-5" />
          </Link>
        </div>
      )}
    </div>
  );
}
