import React from 'react';
import { cn } from '@/lib/utils';

// Neutral garment-only placeholder (no people, ever): a soft silhouette of the
// garment in its colour with the phrase set in type. Shown while Printful's
// flat/ghost render for a product isn't ready, and in the Studio when a blank
// has no flat image. Paths are in a 100×125 box; PRINT_BOX gives where the
// front print sits on each silhouette (fractions of the box).

export const GARMENT_PATHS = {
  tee: 'M33 9 C38 6 42 5 44 4 C46 9 54 9 56 4 C58 5 62 6 67 9 L92 21 C94 22 95 24 94 26 L86 42 C85 44 83 44 81 43 L75 40 L75 116 C75 118 74 119 72 119 L28 119 C26 119 25 118 25 116 L25 40 L19 43 C17 44 15 44 14 42 L6 26 C5 24 6 22 8 21 Z',
  hoodie: 'M36 10 C40 4 60 4 64 10 L70 13 L90 24 C93 26 94 28 94 31 L93 78 C93 81 91 82 89 82 L80 81 L79 117 C79 119 78 120 76 120 L24 120 C22 120 21 119 21 117 L20 81 L11 82 C9 82 7 81 7 78 L6 31 C6 28 7 26 10 24 L30 13 Z M42 11 C44 22 56 22 58 11 C55 14 45 14 42 11 Z',
  hat: 'M14 74 C13 46 28 30 50 30 C72 30 87 46 86 74 C92 76 97 79 98 82 C80 90 40 91 16 84 C14 81 14 78 14 74 Z',
};
export const PRINT_BOX = {
  tee: { cx: 0.5, top: 0.27, w: 0.4, h: 0.5 },
  hoodie: { cx: 0.5, top: 0.36, w: 0.4, h: 0.28 },
  hat: { cx: 0.5, top: 0.39, w: 0.4, h: 0.14 },
};

const lightInk = (hex) => {
  const h = String(hex || '#ddd').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255; const g = (n >> 8) & 255; const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
};

export default function GarmentSilhouette({ kind = 'tee', hex = '#e9e7e1', phrase = '', className, showPhrase = true }) {
  const box = PRINT_BOX[kind] || PRINT_BOX.tee;
  const ink = lightInk(hex) ? 'rgba(255,255,255,0.88)' : 'rgba(17,17,17,0.85)';
  return (
    <div className={cn('relative flex h-full w-full items-center justify-center bg-[#efede8]', className)} aria-hidden>
      <svg viewBox="0 0 100 125" className="h-[86%] w-[86%] drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]" role="presentation">
        <defs>
          <linearGradient id={`shade-${kind}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
            <stop offset="1" stopColor="#000" stopOpacity="0.10" />
          </linearGradient>
        </defs>
        <path d={GARMENT_PATHS[kind] || GARMENT_PATHS.tee} fill={hex} fillRule="evenodd" />
        <path d={GARMENT_PATHS[kind] || GARMENT_PATHS.tee} fill={`url(#shade-${kind})`} fillRule="evenodd" />
        {showPhrase && phrase && (
          <foreignObject x={100 * (box.cx - box.w / 2)} y={125 * box.top} width={100 * box.w} height={125 * box.h}>
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: "'HH Anton', Impact, sans-serif", textTransform: 'uppercase', lineHeight: 0.95, fontSize: kind === 'hat' ? 3.4 : 5.6, color: ink, overflow: 'hidden', wordBreak: 'break-word' }}>
              {phrase}
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}
