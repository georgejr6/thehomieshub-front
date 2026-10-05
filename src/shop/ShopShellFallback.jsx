import React from 'react';

// What /shop shows while its code is still downloading: the shop's own header
// and a skeleton grid on the shop's background, so the switch from the main
// app never shows a blank frame or a spinner. Tiny and dependency-free — App.jsx
// imports it eagerly. `bare` = page area only (inside ShopLayout's chrome).
export default function ShopShellFallback({ bare = false }) {
  const grid = (
    <div className="mx-auto max-w-[1320px] px-4 pt-8 sm:px-6 lg:px-10" aria-hidden>
      <div className="h-3 w-40 animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mt-4 h-14 w-[min(32rem,80%)] animate-pulse rounded-2xl bg-white/[0.06]" />
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] animate-pulse rounded-[22px] bg-white/[0.05]" />
            <div className="mt-3 h-3.5 w-3/4 animate-pulse rounded-full bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
  if (bare) return <div role="status" aria-label="Loading">{grid}</div>;
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0b] text-white" role="status" aria-label="Loading the shop">
      <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-3 px-4 sm:px-6 md:h-16 lg:px-10">
        <span className="h-4 w-4 rounded-full bg-white/10" />
        <span className="text-[19px] font-black uppercase leading-none tracking-wide md:text-[21px]">The Homies <span className="font-serif italic normal-case text-[#f0b94d]">shop</span></span>
      </div>
      {grid}
    </div>
  );
}
