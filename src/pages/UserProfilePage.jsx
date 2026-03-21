import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

import api from '@/api/homieshub';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

import {
  Mail,
  Link as LinkIcon,
  Calendar,
  CheckCircle,
  ShieldBan,
  UserCheck,
  Edit,
  Twitter,
  Instagram,
  Youtube,
  Github,
  Loader2,
  Lock,
  Crown,
  MessageCircle,
  Diamond,
  Gift,
} from 'lucide-react';

import FeedItem from '@/components/FeedItem';
import VideoPost from '@/components/VideoPost';
import EditProfileModal from '@/components/EditProfileModal';
import GiftDialog from '@/components/GiftDialog';

const UserProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user: currentUser, isPremium, triggerLockedFeature } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [reels, setReels] = useState([]);

  // Favorites only for own profile
  const [favorites, setFavorites] = useState({ videos: [], reels: [] });


  // follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const isOwnProfile = useMemo(() => {
    return !!currentUser && currentUser.username === username;
  }, [currentUser, username]);

  const socialLinks = useMemo(
    () => [
      { icon: Twitter, key: 'twitter', url: (handle) => `https://twitter.com/${handle}` },
      { icon: Instagram, key: 'instagram', url: (handle) => `https://instagram.com/${handle}` },
      { icon: Youtube, key: 'youtube', url: (handle) => `https://youtube.com/${handle}` },
      { icon: Github, key: 'github', url: (handle) => `https://github.com/${handle}` },
    ],
    []
  );


  const mapCommunityPostToFeedItem = (p) => {
    const author = p?.author || {};
    return {
      id: p?._id || p?.id,
      _id: p?._id,
      type: p?.type, // thread | poll | trip
      user: {
        id: author?._id || author?.id,
        username: author?.username || "user",
        name: author?.name || author?.username || "User",
        avatar: author?.avatarUrl || "",
        verified: false,
      },
      timestamp: p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
      isSubscriberOnly: !!p?.isSubscriberOnly,
      isNSFW: !!p?.isNSFW,

      // FeedItem expects content.*
      content: {
        text: p?.text || "",
        images: Array.isArray(p?.media) ? p.media.filter(m => m?.type === "image").map(m => m.url).filter(Boolean) : [],
        poll: p?.poll
          ? {
            question: p.poll.question || "",
            options: (p.poll.options || []).map(o => ({
              text: o.text || "",
              percentage: 0, // optional; you can compute later
            })),
            totalVotes: (p.poll.options || []).reduce((sum, o) => sum + (o.votesCount || 0), 0),
            endsIn: p.poll.expiresAt ? new Date(p.poll.expiresAt).toLocaleDateString() : "",
          }
          : null,
        trip: p?.trip
          ? {
            title: "Trip",
            coverImage: p.trip.coverImageUrl || "",
            duration: `${p.trip.durationDays ?? p.trip.duration ?? 1} days`,
            destinations: Array.isArray(p.trip.destinations) ? p.trip.destinations : [],
            isFollowing: false,
          }
          : null,
        event: p?.event
          ? {
            title: p.event.title || "Event",
            description: p.event.description || "",
            coverImage: p.event.coverImageUrl || "",
            startAt: p.event.startAt || null,
            endAt: p.event.endAt || null,
            locationName: p.event.locationName || "",
            locationAddress: p.event.locationAddress || "",
            lat: p.event.lat ?? null,
            lng: p.event.lng ?? null,
            isPaid: !!p.event.isPaid,
            price: p.event.price ?? 0,
            currency: p.event.currency || "USD",
            capacity: p.event.capacity ?? null,
            attendeeCount: p.event.attendeeCount ?? 0,
          }
          : null,

      },

      engagement: {
        likes: p?.stats?.likes ?? 0,
        comments: p?.stats?.comments ?? 0,
        shares: 0,
        saves: 0,
      },
    };
  };


  const getBadge = (u) => {
    const tier = u?.tier || 'Free';
    if (tier === 'Lite' || tier === 'Free') {
      return (
        <Badge
          variant="secondary"
          className="ml-2 font-normal bg-muted text-muted-foreground border-muted-foreground/20"
        >
          Lite Account
        </Badge>
      );
    }
    return (
      <Badge className="ml-2 font-normal bg-gradient-to-r from-yellow-500 to-amber-600 border-none text-white">
        <Crown className="w-3 h-3 mr-1" /> Premium Account
      </Badge>
    );
  };

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [profileRes, contentRes] = await Promise.all([
        api.get(`/profile/${username}`),
        api.get(`/profile/${username}/content`),
      ]);

      const profile = profileRes?.data?.result?.profile;
      const content = contentRes?.data?.result;

      setProfileUser(profile || null);
      setIsFollowing(!!profileRes?.data?.result?.isFollowing);

      setPosts((content?.posts || []).map(mapCommunityPostToFeedItem));

      setVideos(content?.videos || []);
      setReels(content?.reels || []);
    } catch (e) {
      console.error('Profile load failed', e);
      toast({
        title: 'Failed to load profile',
        description: e?.response?.data?.message || e?.message || 'Please try again.',
        variant: 'destructive',
      });
      setProfileUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = async () => {
    if (!isOwnProfile) return;
    try {
      // ✅ Use library endpoint, because it contains SAVED reels/videos/posts
      const res = await api.get('/user/my-library');
      const lib = res?.data?.result;

      const saved = lib?.items?.saved || {};

      setFavorites({
        // VideoPost expects raw video/reel docs (it already handles muxPlaybackId/videoUrl)
        videos: saved?.videos || [],
        reels: saved?.reels || [],
      });
    } catch (e) {
      console.warn('Favorites load failed', e);
      setFavorites({ videos: [], reels: [] });
    }
  };


  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwnProfile]);

  const handleFollow = async () => {
    if (!currentUser) {
      toast({ title: 'Login Required', description: 'You must be logged in to follow users.' });
      return;
    }
    if (!profileUser?._id) return;

    try {
      setFollowBusy(true);

      const resp = await api.post(`/user/follow/${profileUser._id}`);
      const following = !!resp?.data?.result?.following;

      setIsFollowing(following);

      // optimistic follower count update
      setProfileUser((prev) => {
        if (!prev) return prev;
        const prevFollowers = prev?.stats?.followers || 0;
        const nextFollowers = following ? prevFollowers + 1 : Math.max(0, prevFollowers - 1);
        return {
          ...prev,
          stats: { ...(prev.stats || {}), followers: nextFollowers },
        };
      });
    } catch (e) {
      toast({
        title: 'Follow failed',
        description: e?.response?.data?.message || e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setFollowBusy(false);
    }
  };

  const handleMessage = () => {
    if (!currentUser) {
      toast({ title: 'Login Required', description: 'You must be logged in to send messages.' });
      return;
    }
    navigate(`/inbox?user=${username}`);
  };

  const handleProfileUpdated = (updatedData) => {
    // EditProfileModal returns result.profile shape
    setProfileUser((prev) => ({ ...(prev || {}), ...(updatedData || {}) }));
    // reload content (username may have changed)
    if (updatedData?.username && updatedData.username !== username) {
      navigate(`/profile/${updatedData.username}`);
      return;
    }
    // refresh favorites (in case username changed or content changed later)
    loadFavorites();
  };

  const handleOpenWatch = (post) => {
    const postId = post._id || post.id;
    if (!postId) return;
    navigate(`/watch/${postId}`, { state: { username } });
  };

  // derive what to render in tabs
  const userPosts = useMemo(() => posts || [], [posts]);
  const userVideos = useMemo(() => videos || [], [videos]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 md:h-64 w-full" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-start gap-6">
            <Skeleton className="h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-background" />
            <div className="mt-4 sm:mt-20 w-full max-w-lg space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return <div className="text-center p-10">User not found.</div>;
  }

  if (profileUser.isBanned) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-10">
        <ShieldBan className="h-24 w-24 text-destructive mb-4" />
        <h1 className="text-2xl font-bold">This user has been banned</h1>
        <p className="text-muted-foreground">The profile you are trying to view is no longer available.</p>

        {currentUser?.isAdmin && (
          <Button
            // NOTE: admin ban/unban APIs are not implemented yet in backend.
            // leaving button but disabling to avoid broken behavior.
            disabled
            variant="secondary"
            className="mt-6"
          >
            <UserCheck className="mr-2 h-4 w-4" /> Unban User
          </Button>
        )}

        <Link to="/explore">
          <Button className="mt-4">Back to Explore</Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Helmet>
        <title>{`${profileUser.name} (@${profileUser.username})`}</title>
        <meta name="description" content={profileUser.bio} />
      </Helmet>

      <div className="h-48 md:h-64 w-full bg-muted overflow-hidden">
        <img
          className="w-full h-full object-cover"
          alt={`${profileUser.name}'s cover photo`}
          src="https://images.unsplash.com/photo-1665355342041-30378c4b9db9"
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-start">
          <div className="relative flex-shrink-0">
            <Avatar className="h-32 w-32 sm:h-40 sm:w-40 border-4 border-background bg-background">
              <AvatarImage src={profileUser.avatar} alt={profileUser.name} />
              {/* ✅ Prevent charAt crash */}
              <AvatarFallback>{(profileUser?.name || 'U').charAt(0)}</AvatarFallback>
            </Avatar>

            {profileUser.verified && (
              <div className="absolute bottom-2 right-2 bg-primary rounded-full p-1 border-2 border-background">
                <CheckCircle className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
          </div>

          <div className="mt-4 sm:mt-0 sm:ml-6 flex-grow">
            <div className="flex flex-col sm:flex-row justify-between items-start">
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{profileUser.name}</h1>
                  {getBadge(profileUser)}
                </div>
                <p className="text-muted-foreground text-base">@{profileUser.username}</p>
              </div>

              <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
                {isOwnProfile ? (
                  <div className="flex gap-2">
                    {!isPremium && (
                      <Button
                        onClick={triggerLockedFeature}
                        className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-none hover:from-yellow-600 hover:to-amber-700"
                      >
                        <Lock className="h-3 w-3 mr-2" /> Upgrade to Unlock Posting
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleMessage} variant="secondary">
                      <MessageCircle className="mr-2 h-4 w-4" /> Message
                    </Button>

                    <Button onClick={handleFollow} disabled={followBusy}>
                      {followBusy ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Working...
                        </>
                      ) : isFollowing ? (
                        'Following'
                      ) : (
                        'Follow'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-base whitespace-pre-wrap">{profileUser.bio}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-muted-foreground">
              {profileUser.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{profileUser.email}</span>
                </div>
              )}
              {profileUser.website && (
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  <a
                    href={`https://${profileUser.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {profileUser.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Joined {profileUser.joined}</span>
              </div>
            </div>

            {profileUser.socials && (
              <div className="flex gap-4 mt-4">
                {socialLinks.map(({ icon: Icon, key, url }) =>
                  profileUser.socials?.[key] ? (
                    <a
                      key={key}
                      href={url(profileUser.socials[key])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ) : null
                )}
              </div>
            )}

            {/* Points row */}
            <div className="flex items-center gap-4 mt-4">
              {isOwnProfile ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <Diamond className="h-4 w-4 text-primary fill-primary" />
                  <span className="text-sm font-bold text-primary">{(profileUser.walletPoints || 0).toLocaleString()} pts</span>
                </div>
              ) : (
                <>
                  {(profileUser.stats?.giftsReceived > 0) && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Diamond className="h-4 w-4 text-primary/60" />
                      <span>{(profileUser.stats.giftsReceived).toLocaleString()} pts received</span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500 h-8 px-3"
                    onClick={() => setIsGiftOpen(true)}
                  >
                    <Gift className="h-3.5 w-3.5 mr-1.5" /> Gift Points
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <GiftDialog
          isOpen={isGiftOpen}
          onOpenChange={setIsGiftOpen}
          recipientId={profileUser._id}
          recipientName={profileUser.name}
          recipientUsername={profileUser.username}
          targetType="profile"
          targetId={profileUser._id}
        />

        <div className="mt-8">
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-4 md:w-[24rem]">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="reels">Reels</TabsTrigger>
              {isOwnProfile && <TabsTrigger value="favorites">Favorites</TabsTrigger>}
            </TabsList>

            <TabsContent value="posts" className="mt-6">
              <div className="space-y-6 max-w-4xl mx-auto">
                {userPosts.length > 0 ? (
                  userPosts.map((post) => <FeedItem key={post._id || post.id} post={post} />)
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      This user hasn't posted anything yet.
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
            <TabsContent value="reels" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {reels?.length > 0 ? (
                  reels.map((post, index) => (
                    <motion.div
                      key={post._id || post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <VideoPost post={post} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        This user hasn&apos;t uploaded any reels yet.
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>


            <TabsContent value="videos" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                {userVideos.length > 0 ? (
                  userVideos.map((post, index) => (
                    <motion.div
                      key={post._id || post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <VideoPost post={post} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        This user hasn't uploaded any videos yet.
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            {isOwnProfile && (
              <TabsContent value="favorites" className="mt-6">
                <Tabs defaultValue="f-posts" className="w-full">
                  <TabsList>
                    <TabsTrigger value="f-videos">Saved Videos</TabsTrigger>
                    <TabsTrigger value="f-reels">Saved Reels</TabsTrigger>
                  </TabsList>

                  <TabsContent value="f-posts" className="mt-6">
                    <div className="space-y-6 max-w-4xl mx-auto">
                      {favorites?.posts?.length > 0 ? (
                        favorites.posts.map((post) => <FeedItem key={post._id || post.id} post={post} />)
                      ) : (
                        <Card>
                          <CardContent className="p-6 text-center text-muted-foreground">
                            You haven't liked any posts yet.
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="f-reels" className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                      {favorites?.reels?.length > 0 ? (
                        favorites.reels.map((post, index) => (
                          <motion.div
                            key={post._id || post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                          >
                            <VideoPost post={post} />
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full">
                          <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                              You haven&apos;t saved any reels yet.
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  </TabsContent>


                  <TabsContent value="f-videos" className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                      {favorites?.videos?.length > 0 ? (
                        favorites.videos.map((post, index) => (
                          <motion.div
                            key={post._id || post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                          >
                            <VideoPost post={post} />
                          </motion.div>
                        ))
                      ) : (
                        <div className="col-span-full">
                          <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                              You haven't liked any videos yet.
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>



            )}
          </Tabs>
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        userData={profileUser}
        onProfileUpdated={handleProfileUpdated}
      />
    </motion.div>
  );
};

export default UserProfilePage;
