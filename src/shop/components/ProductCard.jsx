import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShopImage } from '@/shop/components/ui';
import {
  KIND_LABEL, KINDS, hashOf, productImage, productAltImage, displayName, kindOf, colorHex, displayColor, customizeKeys, CUSTOM_LABEL,
} from '@/shop/lib/catalog';
import { usd } from '@/shop/lib/pricing';
import { useShop } from '@/shop/ShopContext';
import { studioHref, prefetchStudio } from '@/shop/lib/studioLink';

// One card system for the whole shop: image tile (garment render on a soft
// neutral, silhouette if the render isn't ready), name, price, what you can
// customize, and a Customize shortcut.

function Badges({ keys }) {
  if (!keys.length) return null;
  const shown = keys.slice(0, 2);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {shown.map((k) => <span key={k} className="rounded-full border border-white/10 px-2 py-0.5 text-[10.5px] font-medium text-white/55">{CUSTOM_LABEL[k]}</span>)}
      {keys.length > shown.length && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10.5px] font-medium text-white/40">+{keys.length - shown.length}</span>}
    </div>
  );
}

function CardShell({ to, studio, img, alt, altImg, fallback, title, sub, price, badges, flag, soldOut, priority }) {
  const [hover, setHover] = useState(false);
  const { openStudio } = useShop();
  return (
    <div className="group relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Link to={to} className="block" onFocus={() => setHover(true)} onBlur={() => setHover(false)} aria-label={`${title}, ${price}`}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-[#f2f1ed]">
          <ShopImage src={img} alt={alt} fallback={fallback} fit="contain" className="absolute inset-0 bg-[#f2f1ed]"
            imgClassName="p-[7%] transition-transform duration-700 ease-out group-hover:scale-[1.035]" loading={priority ? 'eager' : 'lazy'} />
          {altImg && <img src={altImg} alt="" aria-hidden loading="lazy" decoding="async" className={cn('absolute inset-0 h-full w-full bg-[#f2f1ed] object-contain p-[7%] transition-opacity duration-500', hover ? 'opacity-100' : 'opacity-0')} />}
          {soldOut ? <span className="absolute left-3 top-3 rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">Sold out</span>
            : flag && <span className="absolute left-3 top-3 rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f0b94d]">{flag}</span>}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-snug">{title}</p>
            <p className="mt-0.5 text-[12px] text-white/45">{sub}</p>
          </div>
          <p className="shrink-0 text-[14px] font-semibold">{price}</p>
        </div>
      </Link>
      <div className="px-0.5"><Badges keys={badges} /></div>
      {!soldOut && badges.length > 0 && (
        <Link to={studioHref(studio)} aria-label={`Customize ${title} in the Studio`} onMouseEnter={prefetchStudio} onFocus={prefetchStudio}
          onClick={(e) => { if (openStudio(studio)) e.preventDefault(); }}
          className="absolute right-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-white/95 px-3 text-[12px] font-semibold text-black shadow-sm transition md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100">
          <PenLine className="h-3.5 w-3.5" /> Customize
        </Link>
      )}
    </div>
  );
}

/** A design family (tee / hoodie / hat of one phrase). Leads with the first garment whose render is ready. */
export function FamilyCard({ family, className, priority = false }) {
  const list = KINDS.map((k) => family.products[k]).filter(Boolean);
  // lead garment rotates per design so the grid mixes tees, hoodies and hats
  const ready = list.filter((p) => productImage(p));
  const lead = ready.length ? ready[hashOf(family.key) % ready.length] : list[0];
  const kind = kindOf(lead);
  const color = kind === 'hat' ? '' : displayColor(lead);
  const keys = [...new Set(list.flatMap(customizeKeys))];
  return (
    <div className={className}>
      <CardShell
        to={`/shop/${lead.slug}`}
        studio={{ product: lead.slug, color }}
        img={productImage(lead, color)}
        alt={`${family.phrase} ${KIND_LABEL[kind]}`}
        altImg={kind === 'hat' ? '' : productAltImage(lead, color)}
        fallback={{ kind, hex: colorHex(color || 'White'), phrase: family.phrase }}
        title={family.phrase}
        sub={list.map((p) => KIND_LABEL[kindOf(p)]).join(' · ')}
        price={usd(family.minPriceCents)}
        badges={keys}
        flag={family.collections.includes('must') ? 'Must-have' : ''}
        soldOut={family.soldOut}
        priority={priority}
      />
    </div>
  );
}

/** A single product (used when a garment / customizable filter is active). */
export function ProductCard({ product, className, priority = false }) {
  const kind = kindOf(product);
  const color = kind === 'hat' ? '' : displayColor(product);
  return (
    <div className={className}>
      <CardShell
        to={`/shop/${product.slug}`}
        studio={{ product: product.slug, color }}
        img={productImage(product, color)}
        alt={product.name}
        altImg={kind === 'hat' ? '' : productAltImage(product, color)}
        fallback={{ kind, hex: colorHex(color || 'White'), phrase: displayName(product) }}
        title={displayName(product)}
        sub={KIND_LABEL[kind]}
        price={usd(product.minPriceCents)}
        badges={customizeKeys(product)}
        soldOut={product.soldOut}
        priority={priority}
      />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div aria-hidden>
      <div className="shop-skel aspect-[4/5] rounded-[22px]" />
      <div className="shop-skel mt-3 h-3.5 w-3/4 rounded-full" />
      <div className="shop-skel mt-2 h-3 w-1/3 rounded-full" />
    </div>
  );
}
