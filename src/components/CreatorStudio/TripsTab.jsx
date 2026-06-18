import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Loader2, Plus, DollarSign, Gift, Sparkles } from 'lucide-react';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

// Creator Studio → Trips. Same data you'd enter uploading a trip, but built to
// monetize: set a price to list it as a paid trip guide in the marketplace, or
// keep it free to grow your following.
const TripsTab = () => {
  const { toast } = useToast();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [destinations, setDestinations] = useState('');
  const [duration, setDuration] = useState('');
  const [budget, setBudget] = useState('');
  const [body, setBody] = useState('');
  const [cover, setCover] = useState('');
  const [price, setPrice] = useState(''); // blank/0 = free

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/marketplace/products/mine');
      setGuides((data?.result?.items || []).filter((p) => p.type === 'trip_guide'));
    } catch { /* not fatal */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const reset = () => { setTitle(''); setDestinations(''); setDuration(''); setBudget(''); setBody(''); setCover(''); setPrice(''); };

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ title: 'Add a title and the guide details', variant: 'destructive' });
      return;
    }
    const priceCents = Math.round(parseFloat(price || '0') * 100);
    setSaving(true);
    try {
      // 1) Create the underlying trip post (same as uploading a trip).
      const tripResp = await api.post('/user/community/trip', {
        text: `${title.trim()}\n\n${body.trim()}`,
        cover_image: cover || undefined,
        duration: duration ? Number(duration) : undefined,
        budget: budget ? Number(budget) : undefined,
        destinations: destinations,
      });
      const r = tripResp?.data?.result || tripResp?.data || {};
      const postId = r?.post?._id || r?._id || r?.trip?._id || null;

      // 2) If priced, list it as a paid trip guide linked to that post.
      if (priceCents > 0) {
        try {
          await api.post('/marketplace/products', {
            title: title.trim(),
            type: 'trip_guide',
            priceCents,
            description: body.trim().slice(0, 4000),
            images: cover ? [cover] : [],
            linkedPostId: postId || undefined,
          });
          toast({ title: 'Trip guide listed 🎉', description: `Live in the marketplace at ${usd(priceCents)}.` });
        } catch (err) {
          const code = err?.response?.data?.error?.code || err?.response?.data?.code;
          if (code === 'upgrade_required') {
            toast({ title: 'Trip posted — upgrade to sell', description: 'Selling needs a Homie ($15/mo) membership. Your trip is live for free for now.' });
          } else if (code === 'no_store') {
            toast({ title: 'Trip posted — open your store', description: 'Open a store in the Store tab to sell it, then re-list.' });
          } else {
            toast({ title: 'Trip posted, but listing failed', description: 'Try listing it from the Store tab.', variant: 'destructive' });
          }
        }
      } else {
        toast({ title: 'Trip posted (free)', description: 'Free guides grow your following — viewers can follow you to see more.' });
      }

      reset();
      await load();
    } catch (err) {
      toast({ title: 'Could not post trip', description: err?.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Create a trip guide</CardTitle>
          <CardDescription>
            Same as posting a trip — but set a price to sell it as a guide, or keep it free to grow your audience.
            Sold guides are how the homies who've actually been somewhere get paid for it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title (e.g. The Real Medellín Playbook)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Destinations (comma separated — e.g. Medellín, Cartagena)" value={destinations} onChange={(e) => setDestinations(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min="0" placeholder="Duration (days)" value={duration} onChange={(e) => setDuration(e.target.value)} />
            <Input type="number" min="0" placeholder="Budget (USD, optional)" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <Textarea
            rows={6}
            placeholder="The guide: where to go, eat, stay, the dynamics, safety, prices, who to avoid… the stuff people actually pay for."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Input placeholder="Cover image URL (optional)" value={cover} onChange={(e) => setCover(e.target.value)} />

          <div className="rounded-xl border border-border p-3 bg-muted/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Monetize</span>
            </div>
            <Input type="number" min="0" step="0.01" placeholder="Price in USD — leave blank to post FREE" value={price} onChange={(e) => setPrice(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Tip: $5–$15 sells best. We take 30%. Selling needs a Homie membership + a store.
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {price && parseFloat(price) > 0 ? 'Post & list for sale' : 'Post free trip'}
            </Button>
            <Button variant="ghost" onClick={reset} disabled={saving}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing trip guides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your trip guides ({guides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
          ) : guides.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No paid trip guides yet. Create one above.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <Card key={g._id} className="overflow-hidden">
                  {g.images?.[0] && <div className="h-28 bg-muted"><img src={g.images[0]} alt={g.title} className="h-full w-full object-cover" /></div>}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm line-clamp-1">{g.title}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">{usd(g.priceCents)}</Badge>
                    </div>
                    <CardDescription>{g.salesCount || 0} sold</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TripsTab;
