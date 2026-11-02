import React from 'react';
import { Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

// Small red play-button shown next to a name when that person linked YouTube.
// `youtube` = { title, handle } (absent => renders nothing).
export default function YouTubeBadge({ youtube, className, size = 14 }) {
  if (!youtube || !(youtube.handle || youtube.title)) return null;
  const h = youtube.handle ? `${String(youtube.handle).startsWith('@') ? '' : '@'}${youtube.handle}` : youtube.title;
  const label = `${h} on YouTube`;
  return (
    <span title={label} aria-label={label} role="img" className={cn('inline-flex shrink-0 items-center align-middle text-[#ff0033]', className)}>
      <Youtube width={size} height={size} aria-hidden="true" />
    </span>
  );
}

const PLATFORMS = {
  youtube: { label: 'YouTube', cls: 'bg-[#ff0033] text-white' },
  kick: { label: 'Kick', cls: 'bg-[#53fc18] text-black' },
};

// "via YouTube" / "Kick" pill for relayed messages from other platforms.
export function PlatformPill({ platform, className }) {
  const p = PLATFORMS[platform];
  if (!p) return null;
  return (
    <span title={`Sent from ${p.label}`} className={cn('inline-flex shrink-0 items-center rounded px-1 text-[10px] font-semibold uppercase leading-4', p.cls, className)}>
      {p.label}
    </span>
  );
}
