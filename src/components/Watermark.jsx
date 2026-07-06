import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Per-user forensic watermark. Overlays the viewer's own identity faintly over
// members-only video and drifts position so it can't be cropped or predicted.
// Doesn't prevent capture — makes any screenshot/recording traceable to one user.
export default function Watermark() {
  const { user } = useAuth();
  const [pos, setPos] = useState({ top: '25%', left: '12%' });

  useEffect(() => {
    const move = () => setPos({
      top: `${8 + Math.random() * 74}%`,
      left: `${4 + Math.random() * 66}%`,
    });
    move();
    const id = setInterval(move, 4500);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;
  const handle = user.username ? `@${user.username}` : '';
  const email = user.email || '';
  const label = [handle, email].filter(Boolean).join('  ·  ');
  if (!label) return null;

  return (
    <div
      className="pointer-events-none absolute z-40 select-none whitespace-nowrap text-[11px] sm:text-xs font-semibold tracking-wide transition-all duration-[1200ms] ease-in-out"
      style={{
        top: pos.top,
        left: pos.left,
        color: 'rgba(255,255,255,0.24)',
        textShadow: '0 1px 3px rgba(0,0,0,0.55)',
        mixBlendMode: 'overlay',
      }}
    >
      {label}
    </div>
  );
}
