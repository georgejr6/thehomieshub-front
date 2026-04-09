import React, { createContext, useContext, useState, useEffect } from 'react';
import { verticalMockPosts as initialVerticalPosts } from '@/data/verticalMockPosts';
import { mockCommunityPosts as initialCommunityPosts } from '@/data/mockCommunityPosts';
import { mockUsers as initialUsers } from '@/data/mockUsers';
import api from "@/api/homieshub";
import { useAuth } from '@/contexts/AuthContext';
import { frogzApi } from '@/lib/frogzApi';

const ContentContext = createContext();

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

// Map backend Reel/Video into UI feed item format (verticalMockPosts-like)
function mapBackendCreator(creator) {
  return {
    name: creator?.name || creator?.fullName || creator?.username || 'User',
    username: creator?.username || creator?.handle || 'user',
    avatar: creator?.avatarUrl || creator?.avatar || '',
    verified: creator?.verified || false
  };
}

function mapReelToVerticalPost(r) {
  const playbackId = r?.muxPlaybackId || r?.videoUrl || null;

  return {
    id: r?._id || r?.id,
    type: 'clip', // your UI uses "clip" for vertical video posts
    backendType: 'reel',
    videoUrl: playbackId || r?.videoUrl || '',
    muxPlaybackId: r?.muxPlaybackId || null,

    // optional thumb - if you later generate via mux image, place it here
    thumbnail: r?.thumbnailUrl || r?.thumbnail || '',

    title: r?.title || '',
    description: r?.caption || '',

    content: {
      title: r?.title || '',
      description: r?.caption || ''
    },

    user: mapBackendCreator(r?.creator),

    engagement: {
      likes: r?.stats?.likes ?? 0,
      comments: r?.stats?.comments ?? 0,
      shares: r?.stats?.shares ?? 0,
      saves: r?.stats?.saves ?? 0
    },

    tags: safeArray(r?.tags),
    timestamp: r?.createdAt || r?.updatedAt || new Date().toISOString(),

    isNew: false,
    isNSFW: !!r?.isNSFW,
    isSubscriberOnly: r?.visibility === "subscribers" || !!r?.isSubscriberOnly,
  };
}

function mapVideoToVerticalPost(v) {
  const playbackId = v?.muxPlaybackId || v?.videoUrl || null;

  return {
    id: v?._id || v?.id,
    type: 'clip',
    backendType: 'video',
    videoUrl: playbackId || v?.videoUrl || '',
    muxPlaybackId: v?.muxPlaybackId || null,

    thumbnail: v?.thumbnailUrl || v?.thumbnail || '',

    title: v?.title || '',
    description: v?.description || v?.caption || '',

    content: {
      title: v?.title || '',
      description: v?.description || v?.caption || ''
    },

    user: mapBackendCreator(v?.creator),

    engagement: {
      likes: v?.stats?.likes ?? 0,
      comments: v?.stats?.comments ?? 0,
      shares: v?.stats?.shares ?? 0,
      saves: v?.stats?.saves ?? 0
    },

    tags: safeArray(v?.tags),
    timestamp: v?.createdAt || v?.updatedAt || new Date().toISOString(),

    isNew: false,
    isNSFW: !!v?.isNSFW,
    isSubscriberOnly: v?.visibility === "subscribers" || !!v?.isSubscriberOnly,
  };
}

const FROGZ_CREATOR = {
  name: 'Freaky Frogz',
  username: 'freakyfrogz',
  avatar: 'https://em-content.zobj.net/source/apple/391/frog_1f438.png',
  verified: false,
};

function mapFrogzClipToVerticalPost(c) {
  return {
    id: `frogz_${c.id}`,
    type: 'clip',
    backendType: 'frogz_clip',
    videoUrl: c.muxPlaybackId || '',
    muxPlaybackId: c.muxPlaybackId || null,
    thumbnail: c.cover || '',
    title: c.title || '',
    description: c.description || '',
    content: { title: c.title || '', description: c.description || '' },
    user: FROGZ_CREATOR,
    engagement: { likes: 0, comments: 0, shares: 0, saves: 0 },
    tags: [],
    timestamp: new Date().toISOString(),
    isNew: false,
    isNSFW: false,
    isSubscriberOnly: false,
    isFrogzClip: true, // flag so UI can suppress follow/comment actions
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mapCommunityPostToFeedItem(p) {
  const author = p?.author || p?.user || {}; // depending on backend population naming

  const type = p?.type || "thread";

  return {
    id: p?._id || p?.id,

    type, // 'thread' | 'poll' | 'trip' | 'event'
    backendType: 'community_post',
    isNSFW: !!p?.isNSFW,
    isSubscriberOnly: !!p?.isSubscriberOnly,

    timestamp: p?.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",

    user: {
      id: author?._id || author?.id,
      name: author?.name || author?.fullName || author?.username || "User",
      username: author?.username || "user",
      avatar: author?.avatarUrl || author?.avatar || "",
      verified: !!author?.verified,
    },

    content: {
      text: p?.text || "",
      images: Array.isArray(p?.media)
        ? p.media.filter(m => m?.type === "image").map(m => m.url).filter(Boolean)
        : [],
      poll: p?.poll ? {
        question: p.poll.question || "",
        options: (p.poll.options || []).map(o => ({ text: o.text || "", percentage: 0 })),
        totalVotes: (p.poll.options || []).reduce((sum, o) => sum + (o.votesCount || 0), 0),
        endsIn: p.poll.expiresAt ? new Date(p.poll.expiresAt).toLocaleDateString() : ""
      } : null,
      trip: p?.trip ? {
        title: "Trip",
        coverImage: p.trip.coverImageUrl || "",
        duration: `${p.trip.durationDays ?? 1} days`,
        destinations: Array.isArray(p.trip.destinations) ? p.trip.destinations : [],
        isFollowing: false
      } : null,
      event: p?.event ? {
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
      } : null,
    },

    engagement: {
      likes: p?.stats?.likes ?? 0,
      comments: p?.stats?.comments ?? 0,
      shares: 0,
      saves: 0,
    },

    // local UI flag
    isLikedByMe: false,
  };
}


export const ContentProvider = ({ children }) => {
  const { user } = useAuth();
  const hasFrogzFeed = Array.isArray(user?.tags) &&
    (user.tags.includes('freakyfrogz_fan') || user.tags.includes('freakyfrogz'));

  const [verticalPosts, setVerticalPosts] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [users, setUsers] = useState(initialUsers);

  // Initialize with some IDs to simulate previously liked content
  const [likedPostIds, setLikedPostIds] = useState(['1', 'comm-2', 'mint-1', 'comm-5']);
  const [savedPostIds, setSavedPostIds] = useState(['2', 'comm-1']); // "Saved" / "Bookmarked" content

  // UI State for Place Modal
  const [placeModalData, setPlaceModalData] = useState({ isOpen: false, placeName: null });

  // Mock Stories Data
  const [stories, setStories] = useState([
    {
      userId: 'alexnomad',
      username: 'alexnomad',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=faces',
      items: [
        { id: 's1', type: 'image', url: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba', timestamp: '2h', viewed: false },
        { id: 's2', type: 'image', url: 'https://images.unsplash.com/photo-1682687221038-404670e01d46', timestamp: '1h', viewed: false }
      ]
    },
  ]);

  const [liveStreams, setLiveStreams] = useState({ active: [], scheduled: [] });
  const [comments, setComments] = useState([]);
const loadCommunityPosts = async () => {
  try {
    // ✅ your backend "fetch community/posts" endpoint
    // If your actual path is different, change ONLY this line.
    const resp = await api.get("/user/community-posts", { params: { page: 1, limit: 50 } });

    const result = resp?.data?.result;
    const items = safeArray(result?.items ?? result);

    const mapped = items.map(mapCommunityPostToFeedItem).filter(p => p?.id);

    // ✅ replace, don't append (prevents mock mixing)
    setCommunityPosts(mapped);
  } catch (err) {
    console.error("Failed to load community posts:", err);
    setCommunityPosts([]);
  }
};

const loadMyLibrary = async () => {
  const resp = await api.get("/user/my-library");
  const result = resp?.data?.result;

  const liked = result?.items?.liked || {};
  const saved = result?.items?.saved || {};

  // ✅ map backend docs -> UI feed items
  const likedItems = [
    ...(safeArray(liked.videos).map(mapVideoToVerticalPost)),
    ...(safeArray(liked.reels).map(mapReelToVerticalPost)),
    ...(safeArray(liked.posts).map(mapCommunityPostToFeedItem)),
  ].filter(x => x?.id);

  const savedItems = [
    ...(safeArray(saved.videos).map(mapVideoToVerticalPost)),
    ...(safeArray(saved.reels).map(mapReelToVerticalPost)),
    ...(safeArray(saved.posts).map(mapCommunityPostToFeedItem)),
  ].filter(x => x?.id);

  // ✅ hydrate IDs so other parts of UI can still rely on ids
  const likedIds = [
    ...safeArray(result?.liked?.videoIds),
    ...safeArray(result?.liked?.reelIds),
    ...safeArray(result?.liked?.postIds),
  ].map(String);

  const savedIds = [
    ...safeArray(result?.saved?.videoIds),
    ...safeArray(result?.saved?.reelIds),
    ...safeArray(result?.saved?.postIds),
  ].map(String);

  setLikedPostIds(likedIds);
  setSavedPostIds(savedIds);

  return { likedItems, savedItems };
};


  // ✅ Load real feed from backend (reels + videos)
  useEffect(() => {
    let cancelled = false;

    const loadVerticalFeed = async () => {
      try {
        const fetches = [
          api.get("/user/reels",  { params: { page: 1, limit: 50 } }),
          api.get("/user/videos", { params: { page: 1, limit: 50 } }),
          hasFrogzFeed ? frogzApi.getClips() : Promise.resolve([]),
        ];

        const [reelsResp, videosResp, frogzClips] = await Promise.all(fetches);

        const reelsResult  = reelsResp?.data?.result;
        const videosResult = videosResp?.data?.result;

        const reels  = safeArray(reelsResult?.items  ?? reelsResult);
        const videos = safeArray(videosResult?.items ?? videosResult);
        const clips  = safeArray(frogzClips);

        const mapped = [
          ...reels.map(mapReelToVerticalPost),
          ...videos.map(mapVideoToVerticalPost),
          ...clips.map(mapFrogzClipToVerticalPost),
        ].filter(p => p?.id && p?.videoUrl);

        // Shuffle instead of chronological sort
        const mixed = shuffle(mapped);

        if (!cancelled && mixed.length) {
          setVerticalPosts([...mixed]);
        }
      } catch (err) {
        console.error("Failed to load reels/videos feed:", err);
        // keep mock feed on failure
      }
    };

    loadVerticalFeed();
    loadCommunityPosts();

    return () => {
      cancelled = true;
    };
  }, [hasFrogzFeed]);

  const addReel = (newReel) => setVerticalPosts(prev => [newReel, ...prev]);
  const addPost = (newPost) => {
  const mapped = mapCommunityPostToFeedItem(newPost);
  if (!mapped?.id) return;
  setCommunityPosts(prev => [mapped, ...prev]);
};
  const deletePost = (id) => {
    setVerticalPosts(prev => prev.filter(p => p.id !== id));
    setCommunityPosts(prev => prev.filter(p => p.id !== id));
  };

  const getTripPosts = (tripId) => {
    return communityPosts.filter(p => p.type === 'clip' || p.type === 'image').slice(0, 5);
  };

  const toggleFollowTrip = (tripId) => {
    console.log("Toggled follow for trip:", tripId);
  };

  const banUser = (username) => {
    setUsers(prev => {
      const updated = { ...prev };
      if (updated[username]) {
        updated[username] = { ...updated[username], isBanned: true };
      }
      return updated;
    });
  };

  const unbanUser = (username) => {
    setUsers(prev => {
      const updated = { ...prev };
      if (updated[username]) {
        updated[username] = { ...updated[username], isBanned: false };
      }
      return updated;
    });
  };

  const muteUser = (username) => {
    setUsers(prev => {
      const updated = { ...prev };
      if (updated[username]) {
        updated[username] = { ...updated[username], isMuted: true };
      }
      return updated;
    });
  };

  const unmuteUser = (username) => {
    setUsers(prev => {
      const updated = { ...prev };
      if (updated[username]) {
        updated[username] = { ...updated[username], isMuted: false };
      }
      return updated;
    });
  };

  // --- Liking & Saving Logic ---
const togglePostLike = async (postId) => {
  const idStr = String(postId);

  // optimistic UI update
  setCommunityPosts(prev => prev.map(p => {
    if (String(p.id) !== idStr) return p;
    const nextLiked = !p.isLikedByMe;
    return {
      ...p,
      isLikedByMe: nextLiked,
      engagement: {
        ...p.engagement,
        likes: Math.max(0, (p.engagement?.likes ?? 0) + (nextLiked ? 1 : -1)),
      }
    };
  }));

  // keep old likedPostIds in sync because FeedItem reads isPostLiked()
  setLikedPostIds(prev => prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]);

  try {
    // ✅ Adjust endpoint if your backend differs
    await api.post(`/user/posts/${idStr}/like`);
  } catch (err) {
    console.error("Like failed:", err);

    // rollback
    setCommunityPosts(prev => prev.map(p => {
      if (String(p.id) !== idStr) return p;
      const rollbackLiked = !p.isLikedByMe;
      return {
        ...p,
        isLikedByMe: rollbackLiked,
        engagement: {
          ...p.engagement,
          likes: Math.max(0, (p.engagement?.likes ?? 0) + (rollbackLiked ? 1 : -1)),
        }
      };
    }));
    setLikedPostIds(prev => prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev]);
    throw err;
  }
};

function normalizeTargetType(t) {
  if (!t) return null;

  // community post UI types -> backend expects community_post
  if (["thread", "poll", "trip", "event", "community_post", "community", "post", "posts"].includes(t)) {
    return "community_post";
  }

  // vertical feed UI type -> decide later if you ever support comments on that feed
  if (t === "clip") return "video"; // safe default; adjust if you later separate reel/video comments

  if (t === "video") return "video";
  if (t === "reel" || t === "reels") return "reel";

  return t; // fallback (backend will validate)
}


const fetchComments = async ({ targetType, targetId, page = 1, limit = 50 }) => {
  console.log("Fetching comments for", targetType, targetId, "page:", page, "limit:", limit);
  const normalized = normalizeTargetType(targetType);

  if (!normalized || !targetId) {
    throw new Error("fetchComments missing targetType/targetId");
  }

  const resp = await api.get("/user/comments", {
    params: { targetType: normalized, targetId, page, limit },
  });

  return resp?.data?.result?.items ?? [];
};

const addComment = async ({ targetType, targetId, text, parentId = null }) => {
  console.log("Adding comment to", targetType, targetId, "text:", text, "parentId:", parentId);
  const normalized = normalizeTargetType(targetType);

  if (!normalized || !targetId || !text?.trim()) {
    throw new Error("addComment missing targetType/targetId/text");
  }
  const resp = await api.post("/user/comment", {
    targetType: normalized,
    targetId,
    text,
    parentCommentId: parentId || undefined,
  });

  setCommunityPosts((prev) =>
    prev.map((p) =>
      String(p.id) === String(targetId)
        ? {
            ...p,
            engagement: {
              ...p.engagement,
              comments: (p.engagement?.comments ?? 0) + 1,
            },
          }
        : p
    )
  );

  return resp?.data?.result?.comment;
};

const toggleContentLike = async ({ targetType, targetId }) => {
  const idStr = String(targetId);
  const alreadyLiked = likedPostIds.includes(idStr);

  // optimistic: update liked ids + engagement count
  setLikedPostIds(prev => alreadyLiked ? prev.filter(x => x !== idStr) : [...prev, idStr]);
  setVerticalPosts(prev =>
    prev.map(p => {
      if (String(p.id) !== idStr) return p;
      return {
        ...p,
        engagement: {
          ...p.engagement,
          likes: Math.max(0, (p.engagement?.likes ?? 0) + (alreadyLiked ? -1 : 1)),
        }
      };
    })
  );

  try {
    const url = targetType === "reel"
      ? `/user/reels/${targetId}/like`
      : `/user/videos/${targetId}/like`;
    await api.post(url);
  } catch (err) {
    // rollback
    setLikedPostIds(prev => alreadyLiked ? [...prev, idStr] : prev.filter(x => x !== idStr));
    setVerticalPosts(prev =>
      prev.map(p => {
        if (String(p.id) !== idStr) return p;
        return {
          ...p,
          engagement: {
            ...p.engagement,
            likes: Math.max(0, (p.engagement?.likes ?? 0) + (alreadyLiked ? 1 : -1)),
          }
        };
      })
    );
    console.error("toggleContentLike failed:", err);
  }
};



  const isPostLiked = (postId) => likedPostIds.includes(String(postId));

const togglePostSave = async ({ targetType, targetId }) => {
  const idStr = String(targetId);

  // optimistic ids update
  setSavedPostIds(prev => prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]);

  // optimistic: update saves count in verticalPosts (if item exists)
  setVerticalPosts(prev =>
    prev.map(p => {
      if (String(p.id) !== idStr) return p;
      const currentlySaved = savedPostIds.includes(idStr);
      const nextSaved = !currentlySaved;
      return {
        ...p,
        engagement: {
          ...p.engagement,
          saves: Math.max(0, (p.engagement?.saves ?? 0) + (nextSaved ? 1 : -1)),
        }
      };
    })
  );

  try {
    await api.post("/user/save", { targetType, targetId: idStr });
  } catch (err) {
    console.error("togglePostSave failed:", err);

    // rollback ids
    setSavedPostIds(prev => prev.includes(idStr) ? prev.filter(x => x !== idStr) : [...prev, idStr]);

    // rollback count
    setVerticalPosts(prev =>
      prev.map(p => {
        if (String(p.id) !== idStr) return p;
        const currentlySaved = savedPostIds.includes(idStr);
        const rollbackSaved = !currentlySaved;
        return {
          ...p,
          engagement: {
            ...p.engagement,
            saves: Math.max(0, (p.engagement?.saves ?? 0) + (rollbackSaved ? 1 : -1)),
          }
        };
      })
    );

    throw err;
  }
};


  const isPostSaved = (postId) => savedPostIds.includes(String(postId));

  const value = {
    verticalPosts,
    communityPosts,
    users,
    liveStreams,
    comments,
    stories,
    placeModalData,
    likedPostIds,
    savedPostIds,
    addReel,
    addPost,
    deletePost,
    getTripPosts,
    toggleFollowTrip,
    markStoryAsViewed: () => {},
    banUser,
    unbanUser,
    muteUser,
    unmuteUser,
    openPlaceModal: () => {},
    closePlaceModal: () => {},
    getPlacePosts: () => [],
    fetchComments,
    addComment,
    addStory: () => {},
    togglePostLike,
    isPostLiked,
    togglePostSave,
    isPostSaved,
    loadCommunityPosts,
    toggleContentLike,
    loadMyLibrary,
  };

  return (
    <ContentContext.Provider value={value}>
      {children}
    </ContentContext.Provider>
  );
};
