import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useShop } from '@/shop/ShopContext';
import { Eyebrow, pageMotion } from '@/shop/components/ui';
import { FamilyCard, CardSkeleton } from '@/shop/components/ProductCard';
import { COLLECTIONS, families } from '@/shop/lib/catalog';

export default function ShopCollection() {
  const { key } = useParams();
  const { loading, products } = useShop();
  const col = COLLECTIONS.find((c) => c.key === key);
  const items = useMemo(() => families(products).filter((f) => f.collections.includes(key)), [products, key]);
  return (
    <motion.div {...pageMotion} className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-6 lg:px-10">
      <Helmet><title>{col ? `${col.label} | The Homies Shop` : 'The Homies Shop'}</title></Helmet>
      <Link to="/shop" className="shop-block inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" /> All merch</Link>
      <div className="mt-6 border-b border-white/[0.07] pb-10">
        <Eyebrow>Collection</Eyebrow>
        <h1 className="font-display mt-3 text-6xl leading-none sm:text-8xl">{col?.label || 'Collection'}</h1>
        {col && <p className="mt-4 text-white/60">{col.blurb}</p>}
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
        {loading ? Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />) : items.map((f, i) => <FamilyCard key={f.key} family={f} priority={i < 4} />)}
      </div>
      {!loading && !items.length && <p className="py-20 text-center text-white/55">Nothing here yet.</p>}
    </motion.div>
  );
}
