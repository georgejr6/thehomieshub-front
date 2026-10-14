import React from 'react';
import { cn } from '@/lib/utils';

// "Listen on Spotify / Apple Music" buttons for songs that are also released
// on those platforms. Renders nothing when there are no links.
const SpotifyIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.85-1.74-6.45-2.14-10.68-1.17a.75.75 0 1 1-.33-1.46c4.63-1.06 8.6-.6 11.77 1.34.35.22.46.68.24 1.04Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.27-2-8.25-2.59-12.11-1.42a.94.94 0 1 1-.55-1.8c4.41-1.33 9.9-.69 13.64 1.62.44.27.58.85.31 1.29Zm.13-3.4C15.18 8.3 8.73 8.08 5 9.21a1.13 1.13 0 1 1-.66-2.16c4.28-1.3 11.4-1.05 15.9 1.62a1.13 1.13 0 0 1-1.15 1.95Z" />
  </svg>
);

const AppleMusicIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path fill="currentColor" d="M18.5 2.2 9.3 4.1c-.6.1-1 .6-1 1.2v10.4a3.4 3.4 0 0 0-1.6-.4C4.9 15.3 3.5 16.5 3.5 18s1.4 2.7 3.2 2.7 3.2-1.2 3.2-2.7V9.2l7.9-1.6v6.1a3.4 3.4 0 0 0-1.6-.4c-1.8 0-3.2 1.2-3.2 2.7s1.4 2.7 3.2 2.7 3.2-1.2 3.2-2.7V3.4c0-.8-.6-1.3-1.4-1.2Z" />
  </svg>
);

const PLATFORMS = [
  { key: 'spotify', label: 'Spotify', Icon: SpotifyIcon, color: 'text-[#1DB954]' },
  { key: 'appleMusic', label: 'Apple Music', Icon: AppleMusicIcon, color: 'text-[#FA2D48]' },
];

export default function StreamingLinks({ links, label = 'Also on', compact = false, className }) {
  const available = PLATFORMS.filter((p) => links?.[p.key]);
  if (available.length === 0) return null;
  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {label && <span className="text-xs uppercase tracking-wider text-gray-400">{label}</span>}
      {available.map(({ key, label: name, Icon, color }) => (
        <a
          key={key}
          href={links[key]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white font-medium',
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          )}
          title={`Listen on ${name}`}
        >
          <Icon className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4', color)} />
          {name}
        </a>
      ))}
    </div>
  );
}
