import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Compass, Tv, Video as VideoIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import VerticalVideoFeed from '@/components/VerticalVideoFeed';
import FeedItem from '@/components/FeedItem';
import { useContent } from '@/contexts/ContentContext';
import FilterBar from '@/components/FilterBar';

const getMuxPosterUrl = (muxPlaybackId) => {
  if (!muxPlaybackId) return null;
  // Mux public thumbnail endpoint (commonly used pattern)
  return `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=0`;
};

const ExplorePage = ({ onLoginRequest }) => {
  const { verticalPosts, communityPosts, users } = useContent();

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedListKey, setSelectedListKey] = useState(null); // 'moments' | 'videos'
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const popularUsers = useMemo(() => Object.values(users || {}).slice(0, 5), [users]);

  // ✅ Split vertical feed by backendType (reel vs video)
  const trendingMoments = useMemo(() => {
    return (verticalPosts || [])
      .filter((p) => p?.backendType === 'reel')
      .slice(0, 8);
  }, [verticalPosts]);

  const trendingVideos = useMemo(() => {
    return (verticalPosts || [])
      .filter((p) => p?.backendType === 'video')
      .slice(0, 8);
  }, [verticalPosts]);

  const handleVideoClick = (video, listKey) => {
    setSelectedVideo(video);
    setSelectedListKey(listKey);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
    setSelectedListKey(null);
  };

  // ✅ Community filtering should NOT treat "videos" as communityPosts
  const getFilteredCommunityPosts = () => {
    if (activeFilter === 'all') return communityPosts;
    if (activeFilter === 'moments') return [];
    if (activeFilter === 'videos') return []; // videos are vertical feed section
    if (activeFilter === 'tweets') return communityPosts.filter((p) => p.type === 'text' || p.type === 'thread');
    if (activeFilter === 'polls') return communityPosts.filter((p) => p.type === 'poll');
    if (activeFilter === 'trips') return communityPosts.filter((p) => p.type === 'trip');
    if (activeFilter === 'events') return communityPosts.filter((p) => p.type === 'event');
    return communityPosts;
  };

  const filteredPosts = getFilteredCommunityPosts();

  const renderVerticalGrid = (items, listKey, titleIcon, titleText) => {
    const Icon = titleIcon;

    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            {titleText}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[9/16] rounded-lg w-[48%] sm:w-[31%] md:w-[23%] lg:w-[18%]" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {items.map((item) => {
              const poster =
                item?.thumbnail ||
                getMuxPosterUrl(item?.muxPlaybackId) ||
                null;

              return (
                <Dialog
                  key={item.id}
                  onOpenChange={(isOpen) => !isOpen && closeVideoModal()}
                >
                  <DialogTrigger asChild>
                    <motion.div
                      onClick={() => handleVideoClick(item, listKey)}
                      className="aspect-[9/16] rounded-lg overflow-hidden relative cursor-pointer group w-[48%] sm:w-[31%] md:w-[23%] lg:w-[18%]"
                      whileHover={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="w-full h-full relative">
                        {poster ? (
                          <img
                            className="w-full h-full object-cover"
                            alt={item?.description || item?.title || 'content'}
                            src={poster}
                          />
                        ) : (
                          // ✅ No default placeholder image; show clean fallback
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <div className="text-center text-muted-foreground px-3">
                              <div className="text-sm font-semibold">No thumbnail</div>
                              <div className="text-xs opacity-80 line-clamp-2">
                                {item?.title || item?.description || 'Untitled'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                      <div className="absolute bottom-2 left-2 right-2 text-white p-1">
                        <p className="font-bold text-base line-clamp-1">{item?.title || 'Untitled'}</p>
                        <p className="text-sm opacity-90 line-clamp-1">
                          @{item?.user?.username || 'user'}
                        </p>
                      </div>
                    </motion.div>
                  </DialogTrigger>

                  {selectedVideo && selectedVideo.id === item.id && selectedListKey === listKey && (
                    <DialogContent className="p-0 border-0 bg-black w-full h-full max-w-full sm:max-w-md sm:h-[90vh] sm:rounded-xl overflow-hidden">
                      <VerticalVideoFeed
                        posts={listKey === 'moments' ? trendingMoments : trendingVideos}
                        onLoginRequest={onLoginRequest}
                        initialPostId={selectedVideo.id}
                        aspectRatio="vertical"
                      />
                    </DialogContent>
                  )}
                </Dialog>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      <Helmet>
        <title>Explore - The Homies Hub</title>
        <meta name="description" content="Discover trending Moments, videos, community posts, and popular creators." />
      </Helmet>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <header className="space-y-4 sticky bg-background/95 backdrop-blur z-40 pb-4 pt-2 -mt-2 top-0">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center gap-3">
              <Compass className="h-10 w-10" />
              Explore
            </h1>
            <p className="text-muted-foreground">Discover new content and creators.</p>
          </div>

          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search posts, Moments, or users."
              className="w-full pl-10"
            />
          </div>

          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            className="px-0"
          />
        </header>

        {/* ✅ Moments Section (reels only) */}
        {(activeFilter === 'all' || activeFilter === 'moments') &&
          renderVerticalGrid(trendingMoments, 'moments', Tv, 'Trending Moments')
        }

        {/* ✅ Videos Section (videos only) */}
        {(activeFilter === 'all' || activeFilter === 'videos') &&
          renderVerticalGrid(trendingVideos, 'videos', VideoIcon, 'Trending Videos')
        }

        {/* Community + Popular Users (hide only when user is explicitly browsing vertical-only categories) */}
        {activeFilter !== 'moments' && activeFilter !== 'videos' && (
          <section>
            <Tabs defaultValue="community" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="community">Community</TabsTrigger>
                <TabsTrigger value="popular-users">Popular Users</TabsTrigger>
              </TabsList>

              <TabsContent value="community">
                {isLoading ? (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 max-w-4xl mx-auto">
                    {filteredPosts.length > 0 ? (
                      filteredPosts.map((post) => (
                        <FeedItem key={post.id} post={post} onLoginRequest={onLoginRequest} />
                      ))
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        No posts found for this category.
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="popular-users">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4 border rounded-lg flex items-center gap-4">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {popularUsers.map((u) => (
                      <Link to={`/profile/${u.username}`} key={u.id || u.username}>
                        <Card className="hover:bg-accent transition-colors">
                          <CardContent className="p-4 flex items-center gap-4">
                            <img
                              className="w-16 h-16 rounded-full object-cover"
                              alt={u.name}
                              src={u.avatar}
                            />
                            <div>
                              <h3 className="font-bold">{u.name}</h3>
                              <p className="text-muted-foreground">@{u.username}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </section>
        )}
      </div>
    </>
  );
};

export default ExplorePage;
