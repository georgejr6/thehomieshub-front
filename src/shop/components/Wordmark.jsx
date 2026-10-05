import React from 'react';
import { cn } from '@/lib/utils';

/** "THE HOMIES SHOP": one upright, all-caps face; SHOP in the shop gold. */
export default function Wordmark({ className }) {
  return (
    // inline font too: the eager loading shell renders before shop.css loads
    <span className={cn('hh-wordmark whitespace-nowrap leading-none', className)}
      style={{ fontFamily: "'HH Archivo', 'Archivo Black', 'Arial Black', system-ui, sans-serif", fontWeight: 900, letterSpacing: '0.08em' }}>
      THE HOMIES <span className="text-[#f0b94d]">SHOP</span>
    </span>
  );
}
