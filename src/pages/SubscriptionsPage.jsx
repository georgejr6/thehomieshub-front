
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Clapperboard, Compass, UserCheck, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import VideoPost from '@/components/VideoPost';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';

const SubscriptionsPage = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchSubscriptions = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/user/subscription-feed');
        if (data.status) {
          setSubscriptions(data.result.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch subscription feed', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [user]);

  // Normalize items to what VideoPost expects
  const normalized = subscriptions.map((item) => ({
    id: item._id,
    title: item.title || item.caption || '',
    thumbnail: item.thumbnailUrl || item.coverImageUrl || '',
    videoUrl: item.videoUrl || '',
    user: {
      name: item.creator?.name || item.creator?.username || 'Creator',
      username: item.creator?.username || '',
      avatar: item.creator?.avatarUrl || '',
    },
    views: item.stats?.views || 0,
    timestamp: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
    isSubscriberOnly: !!item.isSubscriberOnly,
    isNSFW: !!item.isNSFW,
    contentType: item.contentType,
  }));

  const filtered = normalized.filter((item) => {
    const term = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(term) || item.user.name.toLowerCase().includes(term);
  });

  return (
    <>
      <Helmet>
        <title>Subscriptions - The Homies Hub</title>
        <meta name="description" content="Catch up on the latest videos from creators you're subscribed to on The Homies Hub." />
      </Helmet>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center">
              <Clapperboard className="h-8 w-8 mr-4 text-primary" />
              Subscriptions
            </h1>
            <p className="text-muted-foreground mt-2">The latest from your favorite creators.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full md:w-auto min-w-[300px]"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos or creators..."
                className="pl-9 bg-background border-border focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <div className="flex gap-3 mt-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
            {filtered.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <VideoPost post={post} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center text-center py-20 bg-muted/20 border border-dashed rounded-xl"
          >
            {searchQuery ? (
              <>
                <div className="bg-muted p-6 rounded-full mb-4">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold">No matches found</h2>
                <p className="text-muted-foreground mt-2">
                  We couldn't find any videos matching "{searchQuery}" in your subscriptions.
                </p>
              </>
            ) : (
              <>
                <div className="bg-primary/10 p-6 rounded-full mb-6">
                  <UserCheck className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">No subscriptions yet</h2>
                <p className="text-muted-foreground mt-2 max-w-md mb-6">
                  Subscribe to creators to see their latest videos here. Unlock exclusive content and support your favorite homies.
                </p>
                <Button asChild size="lg">
                  <Link to="/explore">
                    <Compass className="mr-2 h-4 w-4" />
                    Discover Creators
                  </Link>
                </Button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </>
  );
};

export default SubscriptionsPage;
