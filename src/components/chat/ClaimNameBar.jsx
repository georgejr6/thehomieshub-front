import React, { useState } from 'react';
import { AtSign, X, Loader2 } from 'lucide-react';
import api from '@/api/homieshub';

// Shown at the top of chat while someone is still on an auto-generated
// "homie123456" name: pick a real one (pre-filled with their Discord handle
// when we know it). Snooze hides it for 3 days.
const SNOOZE_KEY = 'hh_chat_claim_name_snooze';

export default function ClaimNameBar({ me, onSaved }) {
  const [value, setValue] = useState(me?.nameClaim?.suggested || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [hidden, setHidden] = useState(() => {
    try { return Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now(); } catch { return false; }
  });
  if (!me?.nameClaim || hidden) return null;

  const clean = value.trim().toLowerCase().replace(/^@/, '');
  const valid = /^[a-z0-9_.]{2,32}$/.test(clean);

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr('');
    try {
      // Display name follows the new name only if it was the auto one too.
      const autoDisplay = !me.displayName || me.displayName === me.username;
      await api.patch('/profile/me', { username: clean, ...(autoDisplay ? { name: clean } : {}) });
      onSaved?.(clean);
    } catch (e) {
      setErr(e.response?.status === 409 ? 'That name is taken — try another.' : e.response?.data?.message || "Couldn't save that name.");
      setBusy(false);
    }
  };
  const snooze = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 3 * 864e5)); } catch { /* private mode */ }
    setHidden(true);
  };

  return (
    <div className="chat-fade-up flex flex-wrap items-center gap-2 border-b border-[#1F2023] bg-[#5865F2]/15 px-4 py-2 text-sm text-[#DBDEE1]">
      <span className="mr-1">You're showing as <b className="text-white">{me.username}</b> — pick your name:</span>
      <div className="flex items-center rounded bg-[#1E1F22] px-2">
        <AtSign className="h-4 w-4 text-[#949BA4]" />
        <input
          autoFocus={!!me.nameClaim.suggested}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          maxLength={32}
          placeholder="yourname"
          className="w-40 bg-transparent px-1 py-1.5 text-white placeholder-[#6D6F78] outline-none"
        />
      </div>
      <button onClick={save} disabled={!valid || busy} className="flex items-center gap-1 rounded bg-[#5865F2] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
      {value && !valid && <span className="text-xs text-[#F0B232]">2–32 letters, numbers, _ or .</span>}
      {err && <span className="text-xs text-[#F23F43]">{err}</span>}
      <button onClick={snooze} title="Remind me later" className="ml-auto text-[#B5BAC1] hover:text-white"><X className="h-4 w-4" /></button>
    </div>
  );
}
