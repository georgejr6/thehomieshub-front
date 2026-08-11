import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Calendar, Image as ImageIcon, X, Check, Share2, Maximize2, Minimize2, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';
import CryptoUnlockButton from '@/components/CryptoUnlockButton';

const usd = (cents) => `$${((cents || 0) / 100).toFixed(2)}`;

const TripView = ({ isOpen, onClose, post }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  if (!post || post.type !== 'trip') return null;
  const trip = post.content.trip;
  const photos = Array.isArray(post.content?.images) ? post.content.images : [];
  // The title is derived from the first line of text; don't show it twice.
  const rawText = post.content.text || '';
  const firstLine = rawText.split('\n')[0].trim();
  const bodyText = (firstLine && firstLine === trip.title)
    ? rawText.split('\n').slice(1).join('\n').trim()
    : rawText;
  const isOwner = user && user.username === post.user.username;
  const locked = !!post.locked && !isOwner;
  const unlock = post.unlock || null;

  const handleUnlock = async () => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please log in to unlock this guide.' });
      return;
    }
    if (!unlock?.productId) return;
    setUnlocking(true);
    try {
      const { data } = await api.post('/marketplace/checkout', { productId: unlock.productId });
      const url = data?.result?.url;
      if (url) { window.location.href = url; return; }
      throw new Error('no url');
    } catch (err) {
      toast({ title: "Couldn't start checkout", description: err?.response?.data?.message || 'Try again.', variant: 'destructive' });
      setUnlocking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("p-0 overflow-hidden bg-background border-none flex flex-col gap-0 transition-all duration-300",
        isFullScreen ? "max-w-[100vw] h-[100vh] rounded-none" : "max-w-5xl h-[90vh] md:flex-row"
      )}>

        {/* Left Side: Cover / Details */}
        <div className={cn("bg-zinc-900 relative flex flex-col text-white transition-all",
          isFullScreen ? "w-full md:w-80 h-auto md:h-full border-r border-white/10" : "w-full md:w-[350px]"
        )}>
          <div className="h-48 md:h-64 w-full relative shrink-0">
            <img
              src={trip.coverImage || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"}
              alt={trip.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900/90" />
            <Button variant="ghost" size="icon" className="absolute top-4 left-4 text-white hover:bg-black/20 rounded-full md:hidden" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 p-6 -mt-12 relative z-10 flex flex-col overflow-y-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight">{trip.title}</h2>

            <div className="flex items-center gap-3 mb-6">
              <Avatar className="h-8 w-8 border border-white/20">
                <AvatarImage src={post.user.avatar} />
                <AvatarFallback>{post.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Hosted by</span>
                <span className="text-xs text-white/70">@{post.user.username}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="flex items-center gap-2 text-white/80">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{trip.duration}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80 col-span-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="truncate">
                  {(Array.isArray(trip.destinations) ? trip.destinations : []).join(" → ")}
                </span>
              </div>
            </div>

            <p className="text-white/70 text-sm mb-6 leading-relaxed whitespace-pre-wrap">
              {bodyText || "Join me on this adventure! We're exploring hidden gems and local favorites."}
            </p>

            {unlock && (
              <div className="mt-auto pt-4 border-t border-white/10">
                {locked ? (
                  <div className="space-y-2">
                    <Button className="w-full font-bold bg-primary text-black hover:bg-primary/90 gap-2" onClick={handleUnlock} disabled={unlocking}>
                      {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      Unlock guide — {usd(unlock.priceCents)}
                    </Button>
                    <CryptoUnlockButton productId={unlock.productId} priceCents={unlock.priceCents} onSuccess={() => window.location.reload()} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <Check className="h-4 w-4" /> {isOwner ? 'Your paid guide' : 'Unlocked'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Photos / Moments */}
        <div className="flex-1 bg-background flex flex-col h-full relative min-w-0">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-20">
            <h3 className="font-bold text-lg flex items-center gap-2">
              Trip Moments
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {photos.length} photos
              </span>
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="hidden md:flex">
                {isFullScreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 md:p-6 bg-muted/10">
            {locked ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">This is a paid trip guide</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                    Unlock to see the full write-up and all {post.unlock ? 'the' : ''} photos from
                    {' '}@{post.user.username}'s trip.
                  </p>
                </div>
                <div className="w-full max-w-xs space-y-2">
                  <Button className="w-full gap-2" onClick={handleUnlock} disabled={unlocking}>
                    {unlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Unlock for {usd(unlock?.priceCents)}
                  </Button>
                  {unlock?.productId && (
                    <CryptoUnlockButton productId={unlock.productId} priceCents={unlock.priceCents} onSuccess={() => window.location.reload()} />
                  )}
                </div>
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 text-muted-foreground">
                <ImageIcon className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No photos yet</p>
                {isOwner && <p className="text-xs mt-1">Add photos when you create or edit the trip.</p>}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt={`Trip moment ${i + 1}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </a>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default TripView;
