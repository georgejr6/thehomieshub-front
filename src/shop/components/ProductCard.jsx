import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ShopImage } from '@/shop/components/ui';
import { mockupUrl, KIND_LABEL, KINDS, productImage, productAltImage, displayName, kindOf } from '@/shop/lib/catalog';
import { usd } from '@/shop/lib/pricing';

/** Card for a design family (tee/hoodie/hat of one phrase). Hover swaps to the dark colourway. */
export function FamilyCard({ family, className, priority = false }) {
  const [hover, setHover] = useState(false);
  const first = family.products.tee || family.products.hoodie || family.products.hat;
  const kind = family.products.tee ? 'tee' : family.products.hoodie ? 'hoodie' : 'hat';
  const id = family.design?.id;
  const img = id ? mockupUrl(id, kind, 'White') : productImage(first);
  const alt = id && kind !== 'hat' ? mockupUrl(id, kind, kind === 'hoodie' ? 'Bone' : 'Black') : '';
  const kinds = KINDS.filter((k) => family.products[k]);
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className={className}>
      <Link
        to={`/shop/${first.slug}`}
        className="shop-block group block"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f4f3ef]">
          <ShopImage src={img} alt={`${family.phrase} ${KIND_LABEL[kind]}`} className="absolute inset-0 bg-[#f4f3ef]" imgClassName="scale-[1.02] transition-transform duration-700 group-hover:scale-[1.06]" loading={priority ? 'eager' : 'lazy'} />
          {alt && (
            <img src={alt} alt="" aria-hidden loading="lazy" className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-500', hover ? 'opacity-100' : 'opacity-0')} />
          )}
          {family.soldOut && <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">Sold out</span>}
          {family.collections.includes('must') && !family.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[#f0b94d] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">Must-have</span>}
        </div>
        <div className="mt-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-snug">{family.phrase}</p>
            <p className="mt-0.5 text-xs text-white/45">{kinds.map((k) => KIND_LABEL[k]).join(' · ')}</p>
          </div>
          <p className="shrink-0 text-[15px] font-semibold">{usd(family.minPriceCents)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

/** Card for a single product (used when a garment filter is active). */
export function ProductCard({ product, className }) {
  const [hover, setHover] = useState(false);
  const img = productImage(product, 'White');
  const alt = productAltImage(product);
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} className={className}>
      <Link to={`/shop/${product.slug}`} className="shop-block group block" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#f4f3ef]">
          <ShopImage src={img} alt={product.name} className="absolute inset-0 bg-[#f4f3ef]" imgClassName="transition-transform duration-700 group-hover:scale-[1.05]" />
          {alt && <img src={alt} alt="" aria-hidden loading="lazy" className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-500', hover ? 'opacity-100' : 'opacity-0')} />}
          {product.soldOut && <span className="absolute left-3 top-3 rounded-full bg-black/80 px-3 py-1 text-[11px] font-bold uppercase">Sold out</span>}
        </div>
        <div className="mt-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{displayName(product)}</p>
            <p className="mt-0.5 text-xs text-white/45">{KIND_LABEL[kindOf(product)]}</p>
          </div>
          <p className="shrink-0 text-[15px] font-semibold">{usd(product.minPriceCents)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export function CardSkeleton() {
  return (
    <div>
      <div className="shop-skel aspect-[4/5] rounded-2xl" />
      <div className="shop-skel mt-3.5 h-4 w-3/4 rounded-full" />
      <div className="shop-skel mt-2 h-3 w-1/3 rounded-full" />
    </div>
  );
}
