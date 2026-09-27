import React, { useState } from 'react';
import { cn } from '@/lib/utils';

// A member's picture, or their initial when there's none or it fails to load
// (e.g. an old Discord avatar link that no longer exists).
const broken = new Set(); // URLs that failed once this visit
export default function Avatar({ user, size = 40, className }) {
  const [, rerender] = useState(0);
  const url = user?.avatarUrl;
  if (url && !broken.has(url)) {
    return (
      <img src={url} alt="" loading="lazy" draggable={false}
        onError={() => { broken.add(url); rerender((n) => n + 1); }}
        className={cn('shrink-0 rounded-full bg-[#1E1F22] object-cover', className)} style={{ width: size, height: size }} />
    );
  }
  const initial = (user?.displayName || user?.username || '?').slice(0, 1).toUpperCase();
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-[#5865F2] font-semibold text-white', className)} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}
