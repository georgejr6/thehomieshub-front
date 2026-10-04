import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2, Minus, Plus, Share2, Shirt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import CartSheet from '@/components/merch/CartSheet';
import { CartButton } from '@/pages/ShopPage';
import {
  fetchProduct, useMerchCart, usd, variantLabel, optionsFor, findVariant, sizeAvailable, defaultVariant,
  startCheckout, merchError, SHOP_URL, MAX_QTY,
} from '@/lib/merch';

// /shop/:slug — one merch item: pick color/size, add to cart or buy now, share.

export default function ShopProductPage() {
  const { slug } = useParams();
  const { toast } = useToast();
  const { add } = useMerchCart();
  const [product, setProduct] = useState(undefined); // undefined loading, null not found
  const [color, setColor] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [image, setImage] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [buying, setBuying] = useState(false);

  const load = () => {
    fetchProduct(slug)
      .then((p) => {
        setProduct(p || null);
        const v = defaultVariant(p?.variants);
        setColor(v?.color || '');
        setSize(v?.size || '');
        setImage(v?.image || p?.thumbnail || '');
      })
      .catch(() => setProduct(null));
  };
  useEffect(load, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const variants = useMemo(() => product?.variants || [], [product]);
  const { colors, sizes } = useMemo(() => optionsFor(variants), [variants]);
  const selected = findVariant(variants, color, size);
  const canBuy = !!selected?.available;

  const pickColor = (c) => {
    setColor(c);
    // Keep the size if it exists in the new color, else the first buyable one.
    let v = findVariant(variants, c, size);
    if (!v?.available) v = variants.find((x) => (x.color || '') === c && x.available) || v;
    if (v) { setSize(v.size || ''); if (v.image) setImage(v.image); }
  };
  const pickSize = (s) => {
    setSize(s);
    const v = findVariant(variants, color, s);
    if (v?.image) setImage(v.image);
  };

  const line = () => ({
    variantId: selected.id, quantity: qty, name: product.name, variant: variantLabel(selected),
    image: selected.image || product.thumbnail, priceCents: selected.priceCents, slug: product.slug,
  });
  const addToCart = () => {
    const err = add(line());
    if (err) { toast({ title: 'Cart is full', description: err, variant: 'destructive' }); return; }
    setCartOpen(true);
  };
  const buyNow = async () => {
    setBuying(true);
    try {
      await startCheckout([{ variantId: selected.id, quantity: qty }]);
    } catch (err) {
      setBuying(false);
      toast({ title: 'Checkout failed', description: merchError(err, 'Could not start checkout. Try again.'), variant: 'destructive' });
      if (err?.response?.status === 409) load();
    }
  };
  const share = async () => {
    const url = `${SHOP_URL}/${product.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: product.name, text: `${product.name} — Homies merch`, url }); return; }
    } catch (e) {
      if (e?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied' });
    } catch {
      toast({ title: 'Share this link', description: url });
    }
  };

  if (product === undefined) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!product) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-24 text-center text-muted-foreground">
        <Shirt className="mx-auto mb-4 h-12 w-12 opacity-40" />
        <p className="font-medium text-foreground">This item isn't available.</p>
        <Button asChild variant="outline" className="mt-4"><Link to="/shop">Back to merch</Link></Button>
      </div>
    );
  }

  const gallery = [...new Set([image, ...product.images].filter(Boolean))];
  const price = selected?.priceCents ?? product.minPriceCents;

  return (
    <>
      <Helmet><title>{`${product.name} — Homies Merch`}</title></Helmet>
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" /> All merch
          </Link>
          <CartButton onClick={() => setCartOpen(true)} />
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {image
                ? <img src={image} alt={product.name} className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center"><Shirt className="h-16 w-16 text-muted-foreground/40" /></div>}
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {gallery.map((src) => (
                  <button key={src} type="button" onClick={() => setImage(src)} aria-label="Show image"
                    className={cn('block h-16 w-16 shrink-0 overflow-hidden rounded-md border-2', src === image ? 'border-primary' : 'border-transparent')}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{product.name}</h1>
            <p className="mt-2 text-xl font-semibold">{usd(price)}</p>
            {product.description && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>}

            {colors.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium">Color{color ? `: ${color}` : ''}</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const any = variants.some((v) => (v.color || '') === c && v.available);
                    return (
                      <Button key={c} type="button" size="sm" variant={c === color ? 'default' : 'outline'} disabled={!any} onClick={() => pickColor(c)}>
                        {c}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-medium">Size</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const ok = sizeAvailable(variants, color, s);
                    return (
                      <Button key={s} type="button" size="sm" variant={s === size ? 'default' : 'outline'} disabled={!ok}
                        className={cn('min-w-[3rem]', !ok && 'line-through')} onClick={() => pickSize(s)}>
                        {s}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <p className="text-sm font-medium">Qty</p>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}><Minus className="h-3 w-3" /></Button>
              <span className="w-6 text-center">{qty}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Increase quantity" disabled={qty >= MAX_QTY} onClick={() => setQty((q) => q + 1)}><Plus className="h-3 w-3" /></Button>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button size="lg" className="flex-1" disabled={!canBuy || buying} onClick={buyNow}>
                {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : canBuy ? 'Buy now' : 'Sold out'}
              </Button>
              <Button size="lg" variant="outline" className="flex-1" disabled={!canBuy} onClick={addToCart}>Add to cart</Button>
            </div>
            <Button variant="ghost" className="mt-3" onClick={share}><Share2 className="mr-2 h-4 w-4" /> Share</Button>

            <p className="mt-6 text-xs text-muted-foreground">Printed on demand for you. Usually ships in 2–5 business days, then 5–12 business days to arrive.</p>
          </div>
        </div>
      </div>
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} onUnavailable={load} />
    </>
  );
}
