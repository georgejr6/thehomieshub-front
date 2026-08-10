import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Loader2, Plus, DollarSign, Check, ImagePlus, Sparkles, Trash2,
  Camera, Radio, Gift, Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import PostModal from '@/components/PostModal';
import api from '@/api/homieshub';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

// Upload a single image to Spaces (images only; same endpoint PostModal uses).
const uploadImage = async (file) => {
  if (!file) return '';
  const form = new FormData();
  form.append('file', file);
  const resp = await api.post(`/files/upload?folder=${encodeURIComponent('trips/media')}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return resp?.data?.result?.url || '';
};

// Pull a thumbnail + kind out of a community post for the attach picker.
const postThumb = (p) => {
  const img = Array.isArray(p?.media) ? p.media.find((m) => m?.type === 'image')?.url : null;
  return img || p?.trip?.coverImageUrl || p?.event?.coverImageUrl || null;
};

const TripsPage = ({ onLoginRequest }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guides, setGuides] = useState([]);
  const [myPosts, setMyPosts] = useState([]); // community posts with photos
  const [postModalOpen, setPostModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [destinations, setDestinations] = useState('');
  const [duration, setDuration] = useState('');
  const [budget, setBudget] = useState('');
  const [body, setBody] = useState('');
  const [price, setPrice] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState([]); // attached existing posts
  const [newPhotos, setNewPhotos] = useState([]); // [{ file, preview }]
  const photoInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [mine, content] = await Promise.all([
        api.get('/marketplace/products/mine').catch(() => null),
        api.get('/user/my-content').catch(() => null),
      ]);
      setGuides((mine?.data?.result?.items || []).filter((p) => p.type === 'trip_guide'));
      const posts = content?.data?.result?.posts || [];
      // Attachable = your posts that actually carry a photo (a real "moment").
      setMyPosts(posts.filter((p) => postThumb(p)));
    } catch { /* not fatal */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) { onLoginRequest?.(); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const togglePost = (id) =>
    setSelectedPostIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addPhotos = (files) => {
    const picked = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!picked.length) return;
    setNewPhotos((prev) => [...prev, ...picked.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 20));
  };
  const removePhoto = (idx) => setNewPhotos((prev) => prev.filter((_, i) => i !== idx));

  const reset = () => {
    setTitle(''); setDestinations(''); setDuration(''); setBudget(''); setBody('');
    setPrice(''); setSelectedPostIds([]); setNewPhotos([]);
  };

  const momentCount = selectedPostIds.length + newPhotos.length;

  const submit = async () => {
    if (!body.trim()) {
      toast({ title: 'Add the guide details', description: 'Write what makes this trip worth it.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Upload any newly added photos.
      const uploaded = await Promise.all(newPhotos.map((m) => uploadImage(m.file).catch(() => '')));
      const media = uploaded.filter(Boolean).map((url) => ({ url, type: 'image' }));

      const destArr = destinations.split(',').map((d) => d.trim()).filter(Boolean);
      const heading = title.trim() || destArr[0] || 'Trip';

      const tripResp = await api.post('/user/community/trip', {
        text: `${title.trim() ? title.trim() + '\n\n' : ''}${body.trim()}`,
        duration: duration ? Number(duration) : undefined,
        budget: budget ? Number(budget) : undefined,
        destinations: destArr,
        media,
        attachedPostIds: selectedPostIds,
      });
      const created = tripResp?.data?.result?.post || {};
      const postId = created?._id || created?.id || null;

      const priceCents = Math.round(parseFloat(price || '0') * 100);
      if (priceCents > 0) {
        try {
          await api.post('/marketplace/products', {
            title: heading.slice(0, 120),
            type: 'trip_guide',
            priceCents,
            description: body.trim().slice(0, 4000),
            images: [created?.trip?.coverImageUrl, ...media.map((m) => m.url)].filter(Boolean).slice(0, 6),
            linkedPostId: postId || undefined,
          });
          toast({ title: 'Trip guide listed 🎉', description: `Live for sale at ${usd(priceCents)}.` });
        } catch (err) {
          const code = err?.response?.data?.error?.code || err?.response?.data?.code;
          if (code === 'upgrade_required') {
            toast({ title: 'Trip posted — upgrade to sell', description: 'Selling needs a Homie ($15/mo) membership. Your trip is live free for now.' });
          } else if (code === 'no_store') {
            toast({ title: 'Trip posted — open your store', description: 'Open a store in Creator Studio, then list it for sale.' });
          } else {
            toast({ title: 'Trip posted, listing failed', description: 'You can list it later from your store.', variant: 'destructive' });
          }
        }
      } else {
        toast({ title: 'Trip posted (free)', description: 'Free guides grow your following.' });
      }

      reset();
      await load();
    } catch (err) {
      toast({ title: 'Could not post trip', description: err?.response?.data?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <h2 className="text-2xl font-bold">Trips</h2>
        <p className="text-muted-foreground">Log in to set up and sell your trip experiences.</p>
        <Button onClick={onLoginRequest}>Log In</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <Helmet><title>Trips - The Homies Hub</title></Helmet>
      <PostModal isOpen={postModalOpen} onOpenChange={setPostModalOpen} initialPostType={null} />

      <div className="flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-7 w-7 text-primary" /> Trips
          </h1>
          <p className="text-muted-foreground mt-1">Set up an experience from places you've been — attach your posts, or add new moments. Sell it, or keep it free.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Builder */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create a trip</CardTitle>
              <CardDescription>The write-up + the moments are what people pay for.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title (e.g. The Real Punta Cana Playbook)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Destinations (comma separated — e.g. Punta Cana, Bávaro)" value={destinations} onChange={(e) => setDestinations(e.target.value)} />
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

              <div className="rounded-xl border border-border p-3 bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Sell it (optional)</span>
                </div>
                <Input type="number" min="0" step="0.01" placeholder="Price in USD — leave blank to post FREE" value={price} onChange={(e) => setPrice(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> $5–$15 sells best. You keep 70%. Connect payouts in your Wallet to get paid.
                </p>
              </div>

              <Button onClick={submit} disabled={saving} className="w-full gap-2 h-11">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {price && parseFloat(price) > 0 ? `Publish & sell${momentCount ? ` · ${momentCount} moments` : ''}` : `Publish free trip${momentCount ? ` · ${momentCount} moments` : ''}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Moments picker */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4 text-primary" /> Attach moments</CardTitle>
              <CardDescription>Pick from posts you've already made — the ideal way to build a trip.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="py-6 text-center"><Loader2 className="h-5 w-5 animate-spin inline text-primary" /></div>
              ) : myPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {myPosts.map((p) => {
                    const id = p._id || p.id;
                    const selected = selectedPostIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => togglePost(id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selected ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-border'}`}
                      >
                        <img src={postThumb(p)} alt="" className="w-full h-full object-cover" />
                        {selected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <span className="bg-primary text-black rounded-full p-1"><Check className="h-4 w-4" /></span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Camera className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No posts with photos yet — create some to attach.</p>
                </div>
              )}

              {/* Nudge to create new content */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPostModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> New post
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/go-live')}>
                  <Radio className="h-3.5 w-3.5" /> Go live / record
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={load}>
                  Refresh
                </Button>
              </div>

              {/* Add brand-new photos directly */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-1.5"><ImagePlus className="h-4 w-4 text-primary" /> Add photos</span>
                  <span className="text-xs text-muted-foreground">{newPhotos.length}/20</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {newPhotos.map((m, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                      <img src={m.preview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {newPhotos.length < 20 && (
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors">
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <input ref={photoInputRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => addPhotos(e.target.files)} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

export default TripsPage;
