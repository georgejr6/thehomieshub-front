import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { roleColor } from './ChatMarkdown';

// Discord's member list: online members grouped under their highest
// "display separately" role, then everyone offline in one group.
export default function MemberList({ state }) {
  const groups = useMemo(() => {
    const roles = [...state.roles].sort((a, b) => b.position - a.position);
    const online = [];
    const offline = [];
    for (const m of state.members) (state.presence[m.id] ? online : offline).push(m);
    const byRole = new Map();
    const noRole = [];
    for (const m of online) {
      if (m.hoistRoleId) {
        if (!byRole.has(m.hoistRoleId)) byRole.set(m.hoistRoleId, []);
        byRole.get(m.hoistRoleId).push(m);
      } else noRole.push(m);
    }
    const sortName = (a, b) => (a.displayName || '').localeCompare(b.displayName || '');
    const out = roles.filter((r) => byRole.has(r.id)).map((r) => ({ key: r.id, title: r.name, list: byRole.get(r.id).sort(sortName) }));
    if (noRole.length) out.push({ key: 'online', title: 'Online', list: noRole.sort(sortName) });
    if (offline.length) out.push({ key: 'offline', title: 'Offline', list: offline.sort(sortName), dim: true });
    return out;
  }, [state.members, state.presence, state.roles]);

  return (
    <div className="hidden h-full w-60 shrink-0 overflow-y-auto bg-[#2B2D31] px-2 pb-4 [scrollbar-width:thin] lg:block">
      {groups.map((g) => (
        <div key={g.key}>
          <h3 className="px-2 pb-1 pt-6 text-xs font-semibold uppercase tracking-wide text-[#949BA4]">{g.title} — {g.list.length}</h3>
          {g.list.map((m) => {
            const status = state.presence[m.id];
            return (
              <div key={m.id} className={cn('chat-fade-in flex items-center gap-3 rounded px-2 py-1.5 transition-[background-color,opacity] duration-150 hover:bg-[#35373C]', g.dim && 'opacity-40 hover:opacity-100')}>
                <div className="relative shrink-0">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5865F2] text-sm font-semibold text-white">{(m.displayName || '?')[0].toUpperCase()}</div>
                  )}
                  {status && (
                    <span className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-[3px] border-[#2B2D31]', status === 'idle' ? 'bg-[#F0B232]' : 'bg-[#23A55A]')} />
                  )}
                </div>
                <span className="truncate text-[15px] font-medium" style={{ color: m.color ? roleColor(m.color) : '#949BA4' }}>{m.displayName}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
