import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { initialsOf } from '@/lib/spaces';

// Circular avatar with initials fallback.
export default function SpaceAvatar({ name, url, size = 40, className }) {
  const [bad, setBad] = useState(false);
  if (url && !bad) {
    return <img src={url} alt="" draggable={false} loading="lazy" onError={() => setBad(true)}
      className={cn('shrink-0 rounded-full bg-muted object-cover', className)} style={{ width: size, height: size }} />;
  }
  return (
    <div className={cn('flex shrink-0 items-center justify-center rounded-full bg-[#5865F2] font-semibold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initialsOf(name)}
    </div>
  );
}
