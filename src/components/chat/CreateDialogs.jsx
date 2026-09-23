import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Create a poll / event from chat. They're created as real Homies posts
// (same endpoints the app uses, so they also live in the app) and then
// shared into the channel as a live card.

const DURATIONS = [
  { label: '1 hour', h: 1 }, { label: '4 hours', h: 4 }, { label: '8 hours', h: 8 },
  { label: '24 hours', h: 24 }, { label: '3 days', h: 72 }, { label: '1 week', h: 168 },
];

function Shell({ title, onClose, children, footer }) {
  return (
    <div className="chat-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="chat-fade-up w-full max-w-[480px] overflow-hidden rounded-xl bg-[#313338] shadow-2xl">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-[#B5BAC1] hover:text-white"><X className="h-6 w-6" /></button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 pb-4">{children}</div>
        <div className="flex justify-end gap-2 bg-[#2B2D31] px-5 py-4">{footer}</div>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded bg-[#1E1F22] px-3 py-2.5 text-[15px] text-[#DBDEE1] placeholder-[#6D6F78] outline-none ring-[#5865F2] transition-shadow focus:ring-2';
const labelCls = 'mb-2 mt-4 block text-xs font-bold uppercase tracking-wide text-[#B5BAC1]';

export function PollDialog({ onClose, onCreate }) {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState(['', '']);
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const filled = answers.map((a) => a.trim()).filter(Boolean);
  const valid = question.trim() && filled.length >= 2;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr('');
    try {
      await onCreate({ question: question.trim(), options: filled, expiresAt: new Date(Date.now() + hours * 3600e3).toISOString() });
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Couldn\'t create the poll.');
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Create a Poll"
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 text-sm text-white hover:underline">Cancel</button>
        <button onClick={submit} disabled={!valid || busy} className="flex items-center gap-2 rounded bg-[#5865F2] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Post
        </button>
      </>}
    >
      <label className={labelCls}>Question</label>
      <input autoFocus maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What question do you want to ask?" className={inputCls} />
      <label className={labelCls}>Answers</label>
      <div className="space-y-2">
        {answers.map((a, i) => (
          <div key={i} className="chat-fade-up flex items-center gap-2">
            <input maxLength={55} value={a} onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Type your answer" className={inputCls} />
            {answers.length > 2 && (
              <button onClick={() => setAnswers(answers.filter((_, j) => j !== i))} className="p-2 text-[#B5BAC1] hover:text-[#F23F43]"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        ))}
      </div>
      {answers.length < 10 && (
        <button onClick={() => setAnswers([...answers, ''])} className="mt-2 flex items-center gap-1 text-sm text-[#00A8FC] hover:underline"><Plus className="h-4 w-4" /> Add another answer</button>
      )}
      <label className={labelCls}>Duration</label>
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <button key={d.h} onClick={() => setHours(d.h)} className={cn('rounded-full px-3 py-1 text-sm transition-colors', hours === d.h ? 'bg-[#5865F2] text-white' : 'bg-[#1E1F22] text-[#B5BAC1] hover:text-white')}>{d.label}</button>
        ))}
      </div>
      {err && <div className="mt-3 text-sm text-[#F23F43]">{err}</div>}
    </Shell>
  );
}

export function EventDialog({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const valid = title.trim() && date && time;

  const submit = async () => {
    if (!valid || busy) return;
    const startAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startAt.getTime())) return setErr('Pick a valid date and time.');
    setBusy(true);
    setErr('');
    try {
      await onCreate({ title: title.trim(), description: description.trim(), startAt: startAt.toISOString(), location: { name: location.trim() } });
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Couldn\'t create the event.');
      setBusy(false);
    }
  };

  return (
    <Shell
      title="Create an Event"
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className="px-4 py-2 text-sm text-white hover:underline">Cancel</button>
        <button onClick={submit} disabled={!valid || busy} className="flex items-center gap-2 rounded bg-[#5865F2] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4752C4] disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create Event
        </button>
      </>}
    >
      <label className={labelCls}>Event name</label>
      <input autoFocus maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Homies meetup in Medellín" className={inputCls} />
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(inputCls, '[color-scheme:dark]')} /></div>
        <div><label className={labelCls}>Time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={cn(inputCls, '[color-scheme:dark]')} /></div>
      </div>
      <label className={labelCls}>Location</label>
      <input maxLength={200} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where is it?" className={inputCls} />
      <label className={labelCls}>Description</label>
      <textarea rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What should people know?" className={cn(inputCls, 'resize-none')} />
      {err && <div className="mt-3 text-sm text-[#F23F43]">{err}</div>}
    </Shell>
  );
}
