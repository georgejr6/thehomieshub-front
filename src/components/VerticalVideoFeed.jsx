import React, { useRef, useState, useEffect, useCallback } from 'react';
import VerticalVideo from '@/components/VerticalVideo';

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

// Wrap each post with a unique instance key and a random startFraction (0.1–0.85)
function wrapPosts(posts, loopIndex) {
  return posts.map(post => ({
    post,
    instanceKey: `${post.id}-loop${loopIndex}-${Math.random().toString(36).slice(2, 7)}`,
    // First loop (loopIndex 0) always starts from the beginning
    startFraction: loopIndex === 0 ? 0 : parseFloat((Math.random() * 0.75 + 0.1).toFixed(4)),
  }));
}

const VerticalVideoFeed = ({ posts, onLoginRequest, aspectRatio, onTopChange }) => {
  const containerRef = useRef(null);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const loopCountRef = useRef(0);

  // Internal expanded list: each entry is { post, instanceKey, startFraction }
  const [items, setItems] = useState(() => wrapPosts(posts, 0));

  // Re-seed when the source posts list changes (e.g. initial load)
  useEffect(() => {
    loopCountRef.current = 0;
    setItems(wrapPosts(posts, 0));
  }, [posts]);

  // Append a shuffled loop when nearing the end
  const maybeRefill = useCallback((currentIndex, totalItems) => {
    if (totalItems - currentIndex <= REFILL_THRESHOLD && posts.length > 0) {
      loopCountRef.current += 1;
      setItems(prev => [...prev, ...wrapPosts(shuffle(posts), loopCountRef.current)]);
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

  return (
    <div
      ref={containerRef}
      className="h-[100svh] w-full overflow-y-scroll snap-y snap-mandatory bg-black [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      style={{ scrollBehavior: 'smooth' }}
    >
      {items.map(({ post, instanceKey, startFraction }, index) => (
        <VerticalVideo
          key={instanceKey}
          post={post}
          index={index}
          isVisible={index === visibleIndex}
          onLoginRequest={onLoginRequest}
          aspectRatio={aspectRatio}
          startFraction={startFraction}
        />
      ))}
    </div>
  );
};

export default VerticalVideoFeed;
