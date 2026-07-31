import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Loader2, PlayCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import MuxPlayer from '@mux/mux-player-react';
import api from '@/api/homieshub';

// A single past broadcast (VOD) — shareable by direct link, no login required
// to watch. Distinct from LiveStreamPage/:username, which only ever shows a
// creator's MOST RECENT recording; this page links a SPECIFIC one by id.
const VodPage = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vod, setVod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/live/vod/${streamId}`);
        if (!cancelled) setVod(data?.result?.vod || null);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Recording not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [streamId]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Link copied!', description: 'Share it with your friends.' });
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !vod) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center text-center gap-4 max-w-sm">
          <PlayCircle className="h-16 w-16 text-white/20" />
          <h2 className="text-xl font-bold">{error || 'Recording not found'}</h2>
          <Button variant="outline" onClick={() => navigate('/live')}>Browse Live Streams</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{vod.title} — {vod.creator?.name || vod.creator?.username} on The Homies Hub</title>
      </Helmet>

      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>

          <div className="aspect-video bg-zinc-900 rounded-xl overflow-hidden">
            <MuxPlayer
              playbackId={vod.vodPlaybackId}
              streamType="on-demand"
              style={{ width: '100%', height: '100%' }}
              metadata={{ video_title: vod.title }}
            />
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-white/10 text-white/70 border-none">Recording</Badge>
                <span className="text-xs text-white/40">
                  {new Date(vod.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-xl font-bold leading-snug">{vod.title}</h1>
              {vod.description && <p className="text-white/50 text-sm mt-2">{vod.description}</p>}
            </div>
            <Button variant="secondary" size="sm" onClick={handleShare} className="gap-2 shrink-0">
              <Share2 className="h-4 w-4" /> Share
            </Button>
          </div>

          {vod.creator && (
            <Link
              to={`/profile/${vod.creator.username}`}
              className="mt-6 flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors w-fit"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={vod.creator.avatarUrl} />
                <AvatarFallback>{vod.creator.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{vod.creator.name || vod.creator.username}</p>
                <p className="text-white/40 text-xs">@{vod.creator.username}</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default VodPage;
