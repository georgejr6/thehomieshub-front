// "Direct messages" block at the top of the channel sidebar (Discord-style).
// Same data as the inbox (GET /messages via MessageContext, which already
// refreshes on the chat socket's dm.created -> hh:dm-created event and polls),
// so these are the same DMs, reachable without leaving the chat. Compact:
// 5 newest, collapsible, "See all" opens the inbox.
import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMessages } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import { messagePreview } from '@/lib/dmAttachments';
import Avatar from './Avatar';

const MAX_ROWS = 5;

export default function DmSection({ onNavigate }) {
  const { user } = useAuth();
  const { threads, loadThreads } = useMessages();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('hh_chat_dm_collapsed') === '1'; } catch { return false; }
  });
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem('hh_chat_dm_collapsed', next ? '1' : '0'); } catch { /* private mode */ }
  };

  // Refresh when the tab regains focus (live updates arrive via hh:dm-created).
  useEffect(() => {
    const onFocus = () => { loadThreads?.(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [loadThreads]);

  if (!user) return null;
  const rows = threads.filter((t) => !t.archived).slice(0, MAX_ROWS);
  const unreadTotal = threads.reduce((n, t) => n + ((t.unreadCount || 0) > 0 ? 1 : 0), 0);

  const go = (path) => { onNavigate?.(); navigate(path); };
  const open = (t) => {
    const other = (t.participants || []).find((p) => p !== user.username);
    go(other ? `/inbox?user=${encodeURIComponent(other)}&thread=${encodeURIComponent(t.id)}` : '/inbox');
  };

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between pr-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label="Direct messages"
          className="flex min-h-[40px] flex-1 items-center gap-0.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-[#949BA4] transition-colors duration-150 hover:text-[#DBDEE1] md:min-h-[32px]"
        >
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', collapsed && '-rotate-90')} />
          <span>Direct Messages</span>
          {collapsed && unreadTotal > 0 && <span className="ml-1.5 h-2 w-2 rounded-full bg-white" aria-label="Unread messages" />}
        </button>
        <button
          type="button"
          onClick={() => go('/inbox')}
          aria-label="See all direct messages"
          className="flex min-h-[40px] items-center px-1 text-[12px] font-semibold text-[#00A8FC] hover:underline md:min-h-[32px]"
        >
          See all
        </button>
      </div>
      {!collapsed && (rows.length === 0 ? (
        <p className="px-4 py-2 text-[13px] text-[#949BA4]">No conversations yet</p>
      ) : rows.map((t) => {
        const other = (t.participants || []).find((p) => p !== user.username);
        const obj = (t.participantObjects || []).find((p) => (typeof p === 'object' ? p.username : p) === other);
        const unread = (t.unreadCount || 0) > 0;
        const preview = messagePreview(t.lastMessage);
        const name = other || 'Deleted account';
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => open(t)}
            aria-label={`${name}${unread ? ', unread' : ''}`}
            className="mx-2 flex min-h-[48px] w-[calc(100%-16px)] items-center gap-2.5 rounded px-2 py-1 text-left transition-colors duration-150 hover:bg-[#35373C] active:scale-[0.99]"
          >
            <Avatar user={{ id: obj?._id || t.id, username: name, displayName: name, avatarUrl: obj?.avatarUrl, avatar: obj?.avatarUrl }} size={32} />
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-[15px] leading-5', unread ? 'font-bold text-white' : 'font-medium text-[#949BA4]')}>{name}</span>
              {preview && <span className={cn('block truncate text-xs', unread ? 'text-[#DBDEE1]' : 'text-[#949BA4]')}>{preview}</span>}
            </span>
            {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-white" />}
          </button>
        );
      }))}
    </div>
  );
}
