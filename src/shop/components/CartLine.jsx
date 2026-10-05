import React from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Bookmark, ShoppingBag, Pencil } from 'lucide-react';
import { useShop } from '@/shop/ShopContext';
import { ShopImage } from '@/shop/components/ui';
import { usd, unitCents, lineTotalCents } from '@/shop/lib/pricing';
import { MAX_QTY } from '@/shop/lib/cart';

// One cart line (drawer + cart page). Shows the add-on breakdown so people
// see exactly what they pay for.
export default function CartLine({ line, saved = false, compact = false, onEdit }) {
  const { cart, notify, closeCart } = useShop();
  // Custom lines are frozen bag copies — editing opens the original design (or the library), never the copy.
  const href = line.kind === 'custom' ? (line.sourceId ? `/shop/design?design=${encodeURIComponent(line.sourceId)}` : '/shop/library') : line.slug ? `/shop/${line.slug}` : '/shop';
  return (
    <div className="flex gap-4">
      <Link to={href} onClick={closeCart} className={`block shrink-0 overflow-hidden rounded-xl ${compact ? 'h-24 w-20' : 'h-32 w-28'}`} aria-label={line.name}>
        <ShopImage src={line.image} alt="" className="h-full w-full" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={href} onClick={closeCart} className="block truncate font-semibold leading-tight hover:underline">{line.name || 'The Homies merch'}</Link>
            <p className="mt-0.5 text-xs text-white/50">{line.variant}{line.kind === 'custom' ? ' · Your design' : ''}</p>
            {line.houseArt && <p className="mt-0.5 text-[11px] text-[#f6d48f]">Includes The Homies design · listed price</p>}
          </div>
          <p className="shrink-0 font-semibold">{usd(saved ? unitCents(line) : lineTotalCents(line))}</p>
        </div>
        {line.addons?.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-white/55">
            {line.addons.map((a) => (
              <li key={a.key} className="flex justify-between gap-2">
                <span className="truncate">+ {a.label}{a.text ? ` · “${a.text}”` : ''}</span>
                <span className="shrink-0">{a.priceCents ? usd(a.priceCents) : ''}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {saved ? (
            <>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                onClick={() => { const e = cart.moveToCart(line.key); if (e) notify(e, 'error'); }}>
                <ShoppingBag className="h-3.5 w-3.5" /> Move to bag
              </button>
              <button type="button" className="rounded-full p-1.5 text-white/40 hover:text-white" aria-label={`Remove ${line.name}`} onClick={() => cart.removeSaved(line.key)}><Trash2 className="h-4 w-4" /></button>
            </>
          ) : (
            <>
              <div className="inline-flex items-center rounded-full border border-white/12">
                <button type="button" aria-label="Decrease quantity" className="p-2 text-white/70 hover:text-white disabled:opacity-30" disabled={line.quantity <= 1} onClick={() => cart.setQty(line.key, line.quantity - 1)}><Minus className="h-3.5 w-3.5" /></button>
                <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">{line.quantity}</span>
                <button type="button" aria-label="Increase quantity" className="p-2 text-white/70 hover:text-white disabled:opacity-30" disabled={line.quantity >= MAX_QTY} onClick={() => cart.setQty(line.key, line.quantity + 1)}><Plus className="h-3.5 w-3.5" /></button>
              </div>
              {onEdit && line.kind === 'listed' && (
                <button type="button" onClick={() => onEdit(line)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-white/55 hover:text-white"><Pencil className="h-3.5 w-3.5" /> Edit add-ons</button>
              )}
              <button type="button" onClick={() => cart.saveForLater(line.key)} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-white/55 hover:text-white"><Bookmark className="h-3.5 w-3.5" /> Save for later</button>
              <button type="button" onClick={() => cart.remove(line.key)} className="ml-auto rounded-full p-1.5 text-white/40 hover:text-white" aria-label={`Remove ${line.name}`}><Trash2 className="h-4 w-4" /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
