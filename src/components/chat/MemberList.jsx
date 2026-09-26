import React, { useMemo } from 'react';
import { MemberRow } from './MemberDirectory';

// Discord's member list: online members grouped under their highest
// "display separately" role, then everyone offline in one group. Click a
// member to open their card (UserCard: message / mod actions). Searching
// every member lives in the header (MemberSearch).
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
          {g.list.map((m) => <MemberRow key={m.id} m={m} status={state.presence[m.id]} dim={g.dim} />)}
        </div>
      ))}
    </div>
  );
}
