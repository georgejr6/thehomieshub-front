import React, { useMemo, useState } from 'react';
import { Hash, Megaphone, MessagesSquare, ChevronDown, CornerDownRight, Home, Settings, Globe, CheckCheck, Bell, BellOff, Link2, Copy, Timer, Check } from 'lucide-react';
import ContextMenu from './ContextMenu';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';
import Avatar from './Avatar';

const ICONS = { text: Hash, announcement: Megaphone, forum: MessagesSquare, thread: CornerDownRight };

const SLOWMODES = [[0, 'Off'], [5, '5 seconds'], [30, '30 seconds'], [60, '1 minute'], [300, '5 minutes'], [3600, '1 hour']];

function ChannelRow({ c, active, onOpen, muted, depth = 0, onMenu }) {
  const Icon = ICONS[c.type] || Hash;
  const unread = c.unread > 0 && !active;
  return (
    <button
      onClick={() => onOpen(c.id)}
      onContextMenu={(e) => onMenu?.(c, e)}
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

export default function ChannelSidebar({ state, actions, onToast, activeChannelId, onOpen, onClose, onDeleteHistory, onToggleDiscoverable, onOpenSettings }) {
  const [menu, setMenu] = useState(null); // { x, y, sheet, channel } | { x, y, sheet, category }
  const activeName = state.channels.find((c) => c.id === activeChannelId)?.name;
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hh_chat_collapsed') || '{}'); } catch { return {}; }
  });
  const toggle = (cat) => {
    const next = { ...collapsed, [cat]: !collapsed[cat] };
    setCollapsed(next);
    try { localStorage.setItem('hh_chat_collapsed', JSON.stringify(next)); } catch { /* private mode */ }
  };

  const mutedIds = new Set((state.me?.notifications?.mutedChannels || []).map(String));
  const openMenu = (target, e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, sheet: window.innerWidth < 640, ...target });
  };
  const run = async (fn, ok, fail = "Couldn't do that.") => {
    try { await fn(); if (ok) onToast?.(ok); } catch (err) { onToast?.(err.response?.data?.message || fail); }
  };
  const menuItems = () => {
    if (menu?.category) {
      const isCollapsed = collapsed[menu.category];
      return [{ label: isCollapsed ? 'Expand Category' : 'Collapse Category', icon: ChevronDown, onClick: () => toggle(menu.category) }];
    }
    const c = menu.channel;
    const isMuted = mutedIds.has(String(c.id));
    const link = `${window.location.origin}/chat/${c.id}`;
    return [
      (c.unread > 0 || c.mentions > 0) && actions?.markRead && { label: 'Mark As Read', icon: CheckCheck, onClick: () => actions.markRead(c.id) },
      actions?.setChannelMuted && (isMuted
        ? { label: 'Unmute Channel', icon: Bell, onClick: () => run(() => actions.setChannelMuted(c.id, false), `#${c.name} unmuted.`) }
        : { label: 'Mute Channel', icon: BellOff, onClick: () => run(() => actions.setChannelMuted(c.id, true), `#${c.name} muted — no notifications from it.`) }),
      { divider: true },
      { label: 'Copy Link', icon: Link2, onClick: () => run(() => navigator.clipboard.writeText(link), 'Link copied.') },
      state.me?.isStaff && { label: 'Copy Channel ID', icon: Copy, onClick: () => run(() => navigator.clipboard.writeText(String(c.id)), 'Channel ID copied.') },
      ...(c.can?.manageChannel && actions?.setSlowMode && c.type !== 'forum' ? [
        { divider: true },
        { heading: `Slow mode${c.slowModeSec ? ` · ${SLOWMODES.find(([s]) => s === c.slowModeSec)?.[1] || `${c.slowModeSec}s`}` : ''}` },
        ...SLOWMODES.map(([sec, label]) => ({
          label: sec === 0 ? 'Slow mode off' : label,
          icon: (c.slowModeSec || 0) === sec ? Check : Timer,
          onClick: () => run(() => actions.setSlowMode(c.id, sec), sec ? `Slow mode in #${c.name}: ${label}.` : `Slow mode off in #${c.name}.`),
        })),
      ] : []),
    ].filter(Boolean).filter((it, i, arr) => !(it.divider && (i === 0 || i === arr.length - 1 || arr[i + 1]?.divider)));
  };
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
      <div className="hh-chat-scroll min-h-0 flex-1 overflow-y-auto py-2 [scrollbar-width:thin]">
        {groups.map((g) => {
          const isCollapsed = collapsed[g.name];
          return (
            <div key={g.name || '_'} className="mb-1">
              {g.name && (
                <button onClick={() => toggle(g.name)} onContextMenu={(e) => openMenu({ category: g.name }, e)} className="flex w-full items-center gap-0.5 px-1 pb-1 pt-4 text-[12px] font-semibold uppercase tracking-wide text-[#949BA4] transition-colors duration-150 hover:text-[#DBDEE1]">
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
                    <ChannelRow c={c} active={active} onOpen={(id) => { onOpen(id); onClose?.(); }} muted={mutedIds.has(String(c.id))} onMenu={(ch, e) => openMenu({ channel: ch }, e)} />
                    {!isCollapsed && threads.map((t) => (
                      <ChannelRow key={t.id} c={t} depth={1} active={t.id === activeChannelId} onOpen={(id) => { onOpen(id); onClose?.(); }} muted={mutedIds.has(String(t.id))} onMenu={(ch, e) => openMenu({ channel: ch }, e)} />
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
            <Avatar user={me} size={32} />
            <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#232428] transition-colors duration-300', status === 'online' ? 'bg-[#23A55A]' : 'bg-[#80848E]')} />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold" style={{ color: me.color ? roleColor(me.color) : '#F2F3F5' }}>{me.displayName}</div>
            <div className="truncate text-xs text-[#B5BAC1]">{state.status === 'connected' ? 'Online' : state.status === 'reconnecting' ? 'Reconnecting…' : 'Connecting…'}</div>
          </div>
          <div className="relative">
            {/* User settings: profile, notifications (incl. desktop), privacy & data */}
            <button onClick={() => onOpenSettings?.()} title="User settings" aria-label="User settings" className="rounded p-1.5 text-[#B5BAC1] transition-[color,transform] duration-300 hover:rotate-90 hover:bg-[#3F4147] hover:text-white">
              <Settings className="h-5 w-5" />
            </button>
          </div>
          <Link to="/" title="Back to The Homies" className="rounded p-1.5 text-[#B5BAC1] transition-colors hover:bg-[#3F4147] hover:text-white">
            <Home className="h-5 w-5" />
          </Link>
        </div>
      )}
      {menu && (
        <ContextMenu
          menu={menu}
          header={menu.channel ? `#${menu.channel.name}` : menu.category}
          items={menuItems()}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
