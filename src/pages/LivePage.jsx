import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Radio, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/api/homieshub';

const StreamCard = ({ stream }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.25 }}
  >
    <Link to={`/live-stream/${stream.creator?.username}`} className="block group">
      <Card className="overflow-hidden hover:border-primary/50 transition-colors">
        <div className="relative bg-zinc-900 aspect-video flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <Avatar className="h-full w-full">
                <AvatarImage src={stream.creator?.avatarUrl} />
                <AvatarFallback className="text-2xl bg-zinc-700">
                  {stream.creator?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <Badge className="absolute top-2 left-2 bg-red-600 text-white font-bold px-2 py-1 text-xs tracking-widest flex items-center gap-1.5">
            <Radio className="h-3 w-3 animate-pulse" /> LIVE
          </Badge>
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1.5 text-xs text-white/80">
            <Users className="h-3 w-3" />
            {(stream.viewerCount || 0).toLocaleString()}
          </div>
        </div>
        <CardContent className="p-4">
          <h3 className="font-bold text-base leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {stream.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage src={stream.creator?.avatarUrl} />
              <AvatarFallback className="text-[10px]">{stream.creator?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{stream.creator?.name || stream.creator?.username}</span>
            {stream.creator?.username && <span className="text-muted-foreground/50">@{stream.creator.username}</span>}
          </div>
          {stream.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{stream.description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

const LivePage = () => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/live/active');
        if (data.status) {
          setStreams(data.result?.streams || []);
        }
      } catch (_) {}
      finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Helmet>
        <title>Live - The Homies Hub</title>
        <meta name="description" content="Find your next favorite creator, live." />
      </Helmet>
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-3">
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary" />
            </span>
            Live Now
          </h1>
          <p className="text-muted-foreground mt-2">Find your next favorite creator, live.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {streams.length > 0 ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {streams.map((stream) => (
                  <StreamCard key={stream.id || stream._id} stream={stream} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 text-muted-foreground"
              >
                <Radio className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No active streams right now.</p>
                <p className="text-sm mt-1">Check back later or be the first to go live.</p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </>
  );
};

export default LivePage;
