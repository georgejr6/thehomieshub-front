import React, { useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';

// Your Homies Points balance in the chat header. Counts up/down when it
// changes and floats a "+2" / "−1,500" so earning and spending feel real.

export default function PointsPill({ wallet, onClick }) {
  const target = wallet?.balance;
  const [shown, setShown] = useState(target ?? 0);
  const [floats, setFloats] = useState([]);
  const raf = useRef(null);
  const fromRef = useRef(target ?? 0);

  useEffect(() => {
    if (target == null) return undefined;
    const from = fromRef.current;
    const t0 = performance.now();
    const dur = Math.min(900, 250 + Math.abs(target - from) * 2);
    cancelAnimationFrame(raf.current);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - (1 - k) ** 3;
      const v = Math.round(from + (target - from) * eased);
      setShown(v);
      // Track the on-screen value every frame: if the balance changes again
      // mid-count, the next count starts from here instead of jumping back.
      fromRef.current = k < 1 ? v : target;
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);

  const pulse = wallet?.pulse;
  useEffect(() => {
    if (!pulse?.change) return undefined;
    const id = pulse.at;
    setFloats((f) => [...f.slice(-3), { id, change: pulse.change }]);
    const t = setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1500);
    return () => clearTimeout(t);
  }, [pulse?.at]); // eslint-disable-line

  return (
    <button
      type="button"
      onClick={onClick}
      title="Homies Points — gift memberships, send shoutouts, buy points"
      className="relative flex items-center gap-1.5 rounded-full bg-[#F0B94D]/15 px-2.5 py-1 text-sm font-semibold text-[#F0B94D] transition-colors hover:bg-[#F0B94D]/25 active:scale-95"
    >
      <Coins className="h-4 w-4" />
      <span className="tabular-nums">{target == null ? '—' : shown.toLocaleString()}</span>
      {floats.map((f) => (
        <span key={f.id} className={`chat-float-up pointer-events-none absolute left-1/2 top-full z-50 mt-0.5 whitespace-nowrap rounded bg-[#111214] px-1.5 py-0.5 shadow text-xs font-bold ${f.change > 0 ? 'text-[#23A55A]' : 'text-[#F23F43]'}`}>
          {f.change > 0 ? '+' : '−'}{Math.abs(f.change).toLocaleString()}
        </span>
      ))}
    </button>
  );
}
