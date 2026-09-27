import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import api from '@/api/homieshub';
import { cn } from '@/lib/utils';
import { StaffDirectory, MemberResults } from './MemberDirectory';

// Chat header search: a 🔍 that expands into a bar. Finds members by display
// name, @username or Discord name; clicking one opens their card. Staff see
// the whole directory with exact member counts (Discord-only included);
// everyone else gets a normal member search. Ctrl/⌘+K opens it.
export default function MemberSearch({ staff }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef(null);
  const input = useRef(null);

  const close = useCallback(() => { setOpen(false); setQuery(''); }, []);
  const searchMembers = useCallback(
    async (q) => (await api.get('/chat/members', { params: { query: q, limit: 25 } })).data.result || [],
    []
  );

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    const key = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); }
      else if (e.key === 'Escape' && open && !document.querySelector('[data-chat-user-card]')) close();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, close]);
  useEffect(() => {
    if (!open) return undefined;
    // Clicks inside the member card (opened from a result) don't close search.
    const down = (e) => { if (!box.current?.contains(e.target) && !e.target.closest?.('[data-chat-user-card]')) close(); };
    document.addEventListener('pointerdown', down, true);
    return () => document.removeEventListener('pointerdown', down, true);
  }, [open, close]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} title="Search members (Ctrl+K)" aria-label="Search members"
        className="rounded p-1 text-[#B5BAC1] transition-colors hover:bg-white/5 hover:text-[#DBDEE1] active:scale-95">
        <Search className="h-5 w-5" />
      </button>
    );
  }

  const q = query.trim().replace(/^@/, '');
  return (
    // Phones: the bar takes over the whole header; wider screens: it grows in place.
    <div ref={box} className="fixed inset-x-0 top-0 z-50 flex h-12 items-center bg-[#313338] px-3 sm:relative sm:z-auto sm:h-auto sm:bg-transparent sm:px-0">
      <label className="chat-search-open flex w-full items-center gap-1.5 rounded bg-[#1E1F22] px-2 ring-1 ring-[#5865F2] sm:w-64">
        <Search className="h-4 w-4 shrink-0 text-[#949BA4]" />
        <input ref={input} value={query} onChange={(e) => setQuery(e.target.value.slice(0, 40))}
          placeholder={staff ? 'Search every member' : 'Search members'} aria-label="Search members"
          className="w-full min-w-0 bg-transparent py-1.5 text-sm text-[#DBDEE1] outline-none placeholder:text-[#6D6F78]" />
        <button type="button" onClick={close} aria-label="Close search" className="-m-2 p-2 text-[#949BA4] hover:text-white"><X className="h-4 w-4" /></button>
      </label>
      <div className={cn('chat-fade-up absolute right-0 top-full z-50 max-h-[70vh] overflow-y-auto rounded-b-lg bg-[#2B2D31] py-2 shadow-2xl ring-1 ring-black/40 [scrollbar-width:thin]',
        'left-0 sm:left-auto sm:mt-2 sm:w-[380px] sm:rounded-lg')}>
        {staff ? <StaffDirectory query={q} /> : <MemberResults query={q} searchMembers={searchMembers} />}
      </div>
    </div>
  );
}
