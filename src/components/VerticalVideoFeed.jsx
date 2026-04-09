import React, { useRef, useState, useEffect } from 'react';
import VerticalVideo from '@/components/VerticalVideo';

const VerticalVideoFeed = ({ posts, onLoginRequest, aspectRatio, onTopChange }) => {
  const containerRef = useRef(null);
  const [visiblePost, setVisiblePost] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10);
            setVisiblePost(index);
            onTopChange?.(index === 0);
          }
        });
      },
      { threshold: 0.6 }
    );

    const children = containerRef.current?.children;
    if (children) {
      Array.from(children).forEach(child => observer.observe(child));
    }

    return () => {
        if (children) {
            Array.from(children).forEach(child => observer.unobserve(child));
        }
    };
  }, [posts, onTopChange]);

  return (
    <div 
        ref={containerRef}
        className="h-[100svh] w-full overflow-y-scroll snap-y snap-mandatory bg-black [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{ scrollBehavior: 'smooth' }}
    >
      {posts.map((post, index) => (
        <VerticalVideo 
            key={post.id}
            post={post} 
            index={index}
            isVisible={index === visiblePost}
            onLoginRequest={onLoginRequest}
            aspectRatio={aspectRatio}
        />
      ))}
    </div>
  );
};

export default VerticalVideoFeed;