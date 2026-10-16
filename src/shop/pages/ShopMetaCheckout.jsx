import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useShop } from '@/shop/ShopContext';
import { displayName, productImage, kindOf, KIND_LABEL } from '@/shop/lib/catalog';

// Instagram / Facebook Shop "checkout URL" (Meta Commerce Manager): a buyer who
// taps Buy on a tagged product lands on /shop/checkout?products=<id>:<qty>,...
// where <id> is the feed item id = Printful sync variant id
// (backend utils/merch/metaFeed.js). We drop those pieces into the bag and
// open it; anything unknown or sold out is skipped. Meta may append
// coupon / utm / cart_origin params — ignored.

export function parseMetaProducts(raw) {
  return String(raw || '').split(',').map((part) => {
    const [id, qty] = decodeURIComponent(part).split(':');
    const variantId = Number(id);
    const quantity = Math.max(1, Math.min(10, Math.floor(Number(qty) || 1)));
    return Number.isSafeInteger(variantId) && variantId > 0 ? { variantId, quantity } : null;
  }).filter(Boolean).slice(0, 10);
}

export default function ShopMetaCheckout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { products, loading, cart, notify } = useShop();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || loading) return;
    done.current = true;
    const wanted = parseMetaProducts(params.get('products'));
    let added = 0;
    for (const { variantId, quantity } of wanted) {
      const product = (products || []).find((p) => (p.variants || []).some((v) => v.id === variantId));
      const v = product?.variants.find((x) => x.id === variantId);
      if (!product || !v?.available) continue;
      const err = cart.add({
        kind: 'listed', variantId, quantity, addons: [],
        name: displayName(product), variant: [KIND_LABEL[kindOf(product)], v.color, v.size].filter(Boolean).join(' · '),
        image: productImage(product, v.color), slug: product.slug, priceCents: v.priceCents,
      });
      if (!err) added += 1;
    }
    if (wanted.length && !added) notify('That item is no longer available.', 'error');
    navigate(added ? '/shop/cart' : '/shop', { replace: true });
  }, [loading, products, params, cart, notify, navigate]);

  return (
    <Helmet><title>Checkout | The Homies Shop</title><meta name="robots" content="noindex" /></Helmet>
  );
}
