import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation, useParams, Navigate } from "react-router-dom";
import VerticalVideoFeed from "@/components/VerticalVideoFeed";
import { useContent } from "@/contexts/ContentContext";
import api from "@/api/homieshub";

// helpers
const safeArray = (v) => (Array.isArray(v) ? v : []);

const mapCreator = (creator) => ({
  id: creator?._id || creator?.id,
  name: creator?.name || creator?.fullName || creator?.username || "User",
  username: creator?.username || "user",
  avatar: creator?.avatarUrl || creator?.avatar || "",
  verified: !!creator?.verified,
});

const mapVideoToFeedPost = (v) => {
  const id = v?._id || v?.id;
  const creator = mapCreator(v?.creator);

  return {
    id,
    type: "clip",
    kind: "video",
    muxPlaybackId: v?.muxPlaybackId || null,
    videoUrl: v?.videoUrl || "",

    thumbnail: v?.thumbnailUrl || v?.thumbnail || "",
    title: v?.title || "",
    description: v?.description || v?.caption || "",

    user: creator,

    engagement: {
      likes: v?.stats?.likes ?? 0,
      comments: v?.stats?.comments ?? 0,
      shares: v?.stats?.shares ?? 0,
      saves: v?.stats?.saves ?? 0,
    },

    tags: safeArray(v?.tags),
    timestamp: v?.createdAt || v?.updatedAt || new Date().toISOString(),

    isNSFW: !!v?.isNSFW,
    isSubscriberOnly: !!v?.isSubscriberOnly,
  };
};

const mapReelToFeedPost = (r) => {
  const id = r?._id || r?.id;
  const creator = mapCreator(r?.creator);

  return {
    id,
    type: "clip",
    kind: "reel",
    muxPlaybackId: r?.muxPlaybackId || null,
    videoUrl: r?.videoUrl || "",

    thumbnail: r?.thumbnailUrl || r?.thumbnail || "",
    title: r?.title || "",
    description: r?.caption || "",

    user: creator,

    engagement: {
      likes: r?.stats?.likes ?? 0,
      comments: r?.stats?.comments ?? 0,
      shares: r?.stats?.shares ?? 0,
      saves: r?.stats?.saves ?? 0,
    },

    tags: safeArray(r?.tags),
    timestamp: r?.createdAt || r?.updatedAt || new Date().toISOString(),

    isNSFW: !!r?.isNSFW,
    isSubscriberOnly: !!r?.isSubscriberOnly,
  };
};

const WatchPage = ({ onLoginRequest }) => {
  const { postId } = useParams();
  const location = useLocation();
  const { verticalPosts: globalPosts } = useContent();

  // username is passed as state when navigating from a profile page
  const username = location?.state?.username || null;

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [initialIndex, setInitialIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      try {
        setLoading(true);

        if (username) {
          // ── Profile-originated navigation: load that creator's content ──
          const resp = await api.get(`/profile/${username}/content`, {
            params: { page: 1, limit: 100 },
          });
          const result = resp?.data?.result || {};
          const mapped = [
            ...safeArray(result?.videos).map(mapVideoToFeedPost),
            ...safeArray(result?.reels).map(mapReelToFeedPost),
          ]
            .filter((p) => p?.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          if (!cancelled) {
            setPosts(mapped);
            const idx = mapped.findIndex((p) => String(p.id) === String(postId));
            setInitialIndex(idx >= 0 ? idx : 0);
          }
        } else {
          // ── Shared link: use global feed, target post first ─────────────
          const all = safeArray(globalPosts).filter((p) => p?.id);
          const idx = all.findIndex((p) => String(p.id) === String(postId));

          if (idx >= 0) {
            // Rotate so shared post is first, rest follows in order
            const ordered = [...all.slice(idx), ...all.slice(0, idx)];
            if (!cancelled) { setPosts(ordered); setInitialIndex(0); }
          } else {
            // Post not yet in global feed — fallback: show all from top
            if (!cancelled) { setPosts(all); setInitialIndex(0); }
          }
        }
      } catch (e) {
        console.error("WatchPage: failed to load content", e);
        if (!cancelled) setPosts(safeArray(globalPosts));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Wait until global posts have loaded before running the shared-link path
    if (!username && globalPosts.length === 0) return;
    loadContent();

    return () => { cancelled = true; };
  }, [username, postId, globalPosts]);

  const title = useMemo(
    () => username ? `Watch @${username} - The Homies Hub` : "The Homies Hub",
    [username]
  );

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>

      <div className="flex flex-col h-full bg-black relative">
        {/* No stories header here; just the watch feed */}
        <div className="flex-1 min-h-0 w-full bg-black relative overflow-hidden">
          <VerticalVideoFeed
            posts={posts}
            onLoginRequest={onLoginRequest}
            aspectRatio="vertical"
            initialIndex={initialIndex} // ✅ if your VerticalVideoFeed supports it
          />
        </div>
      </div>
    </>
  );
};

export default WatchPage;
