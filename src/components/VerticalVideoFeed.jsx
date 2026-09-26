import React, { useRef, useState, useEffect, useCallback } from 'react';
import VerticalVideo from '@/components/VerticalVideo';
import MusicFeedCard from '@/components/music/MusicFeedCard';
import { useVideoPlaybackDisabled } from '@/lib/videoPlaybackStatus';

// How many posts from the end before we append more
const REFILL_THRESHOLD = 3;

// Shuffle an array (Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Wrap each post with a unique instance key.
// Start-time is now handled by VerticalVideo's session window system — no startFraction needed.
function wrapPosts(posts, loopIndex) {
  return posts.map(post => ({
    post,
    instanceKey: `${post.id}-loop${loopIndex}-${Math.random().toString(36).slice(2, 7)}`,
  }));
}

const VerticalVideoFeed = ({ posts, onLoginRequest, aspectRatio, onTopChange, initialIndex = 0 }) => {
  const playbackDisabled = useVideoPlaybackDisabled();
  const containerRef = useRef(null);
  const [visibleIndex, setVisibleIndex] = useState(initialIndex);
  const loopCountRef = useRef(0);

  // Internal expanded list: each entry is { post, instanceKey }
  const [items, setItems] = useState(() => wrapPosts(posts, 0));

  // Re-seed when the source posts list changes (e.g. initial load)
  useEffect(() => {
    loopCountRef.current = 0;
    setItems(wrapPosts(posts, 0));
  }, [posts]);

  // Scroll to initialIndex on mount
  useEffect(() => {
    if (!initialIndex || !containerRef.current) return;
    // Use instant scroll so there's no animation on first load
    containerRef.current.scrollTop = initialIndex * containerRef.current.clientHeight;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Append a shuffled loop when nearing the end
  const maybeRefill = useCallback((currentIndex, totalItems) => {
    if (totalItems - currentIndex <= REFILL_THRESHOLD && posts.length > 0) {
      loopCountRef.current += 1;
      // Reshuffle videos, keep songs spaced out (one after every 6 videos).
      const videos = shuffle(posts.filter(p => p.type !== 'music'));
      const songs = shuffle(posts.filter(p => p.type === 'music'));
      const mixed = [];
      videos.forEach((v, i) => { mixed.push(v); if ((i + 1) % 6 === 0 && songs.length) mixed.push(songs.shift()); });
      setItems(prev => [...prev, ...wrapPosts(mixed.length ? mixed : shuffle(posts), loopCountRef.current)]);
    }
  }, [posts]);

  // IntersectionObserver to track visible post
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10);
            setVisibleIndex(index);
            onTopChange?.(index === 0);
            maybeRefill(index, container.children.length);
          }
        });
      },
      { threshold: 0.6 }
    );

    Array.from(container.children).forEach(child => observer.observe(child));
    return () => Array.from(container.children).forEach(child => observer.unobserve(child));
  }, [items, onTopChange, maybeRefill]);

  // Blunt site-wide circuit breaker (2026-09-23) — when on, no VerticalVideo
  // (and therefore no <video>/<MuxPlayer>) ever mounts, for anyone, full
  // stop. Independent of Mux-level state, visibility, membership, or the
  // content-lockdown system. `playbackDisabled === null` means the check
  // hasn't resolved yet — render nothing rather than flash content first.
  if (playbackDisabled !== false) {
    return (
      <div className="h-[100svh] w-full flex items-center justify-center bg-black text-center px-6">
        {playbackDisabled && (
          <p className="text-white/40 text-sm">Video playback is temporarily unavailable.</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[100svh] w-full overflow-y-scroll snap-y snap-mandatory bg-black [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{ scrollBehavior: 'smooth' }}
    >
      {items.map(({ post, instanceKey }, index) => post.type === 'music' ? (
        <MusicFeedCard
          key={instanceKey}
          post={post}
          index={index}
          isVisible={index === visibleIndex}
          onLoginRequest={onLoginRequest}
        />
      ) : (
        <VerticalVideo
          key={instanceKey}
          post={post}
          index={index}
          isVisible={index === visibleIndex}
          onLoginRequest={onLoginRequest}
          aspectRatio={aspectRatio}
        />
      ))}
    </div>
  );
};

export default VerticalVideoFeed;
