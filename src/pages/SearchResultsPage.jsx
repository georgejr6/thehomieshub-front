import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Film, MessageSquare, Loader2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import VideoPost from '@/components/VideoPost';
import FeedItem from '@/components/FeedItem';
import api from '@/api/homieshub';

function useDebounce(value, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function normalizeVideo(v, type) {
  return {
    ...v,
    id: v._id || v.id,
    _backendType: type,
    muxPlaybackId: v.muxPlaybackId || null,
    thumbnail: v.thumbnailUrl || v.thumbnail || (v.muxPlaybackId ? `https://image.mux.com/${v.muxPlaybackId}/thumbnail.png?width=400` : ''),
    title: v.title || v.caption || 'Untitled',
    isSubscriberOnly: v.visibility === 'subscribers' || !!v.isSubscriberOnly,
  };
}

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [input, setInput] = useState(query);
  const debounced = useDebounce(input);

  const [videos, setVideos]   = useState([]);
  const [reels,  setReels]    = useState([]);
  const [posts,  setPosts]    = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  // Sync URL → input on load
  useEffect(() => { setInput(query); }, [query]);

  // Live search as user types
  useEffect(() => {
    if (!debounced.trim()) {
      setVideos([]); setReels([]); setPosts([]);
      return;
    }

    // update URL without full navigation
    setSearchParams({ q: debounced }, { replace: true });

    // Cancel previous in-flight requests
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    Promise.all([
      api.get('/user/videos',          { params: { q: debounced, limit: 30 }, signal: ctrl.signal }).catch(() => null),
      api.get('/user/reels',           { params: { q: debounced, limit: 30 }, signal: ctrl.signal }).catch(() => null),
      api.get('/user/community-posts', { params: { q: debounced, limit: 20 }, signal: ctrl.signal }).catch(() => null),
    ]).then(([vRes, rRes, pRes]) => {
      if (ctrl.signal.aborted) return;
      setVideos((vRes?.data?.result?.items || []).map(v => normalizeVideo(v, 'video')));
      setReels((rRes?.data?.result?.items  || []).map(r => normalizeVideo(r, 'reel')));
      setPosts(pRes?.data?.result?.items || []);
    }).finally(() => {
      if (!ctrl.signal.aborted) setLoading(false);
    });
  }, [debounced]);

  const allMedia = [...videos, ...reels];
  const totalAll = allMedia.length + posts.length;

  return (
    <>
      <Helmet>
        <title>Search — The Homies Hub</title>
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold tracking-tight mb-4">Search</h1>

          {/* Live search input */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Search videos, reels, posts…"
              className="pl-10 pr-10 h-12 text-base"
            />
            {input && (
              <button
                onClick={() => { setInput(''); setSearchParams({}); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.header>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground mb-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Searching…</span>
          </div>
        )}

        {debounced && !loading && (
          <p className="text-muted-foreground text-sm mb-6">
            {totalAll} result{totalAll !== 1 ? 's' : ''} for <span className="font-semibold text-foreground">"{debounced}"</span>
          </p>
        )}

        {debounced ? (
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger value="all">
                <Search className="mr-2 h-4 w-4" /> All ({totalAll})
              </TabsTrigger>
              <TabsTrigger value="videos">
                <Film className="mr-2 h-4 w-4" /> Videos & Reels ({allMedia.length})
              </TabsTrigger>
              <TabsTrigger value="posts">
                <MessageSquare className="mr-2 h-4 w-4" /> Posts ({posts.length})
              </TabsTrigger>
            </TabsList>

            {/* ALL */}
            <TabsContent value="all">
              {allMedia.length > 0 && (
                <>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Videos & Reels</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                    {allMedia.map((item, i) => (
                      <motion.div key={item.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <VideoPost post={item} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
              {posts.length > 0 && (
                <>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Posts</h3>
                  <div className="space-y-4 max-w-4xl">
                    {posts.map((post, i) => (
                      <motion.div key={post._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                        <FeedItem post={post} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
              {totalAll === 0 && !loading && (
                <div className="text-center py-20">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold">No results found</h2>
                  <p className="text-muted-foreground mt-1">Try a different search term.</p>
                </div>
              )}
            </TabsContent>

            {/* VIDEOS */}
            <TabsContent value="videos">
              {allMedia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {allMedia.map((item, i) => (
                    <motion.div key={item.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <VideoPost post={item} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">No videos or reels found.</p>
              )}
            </TabsContent>

            {/* POSTS */}
            <TabsContent value="posts">
              {posts.length > 0 ? (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {posts.map((post, i) => (
                    <motion.div key={post._id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <FeedItem post={post} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-12">No posts found.</p>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="mx-auto h-12 w-12 mb-4" />
            <p>Start typing to search videos, reels, and posts.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchResultsPage;
