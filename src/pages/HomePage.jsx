import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import VerticalVideoFeed from '@/components/VerticalVideoFeed';
import { useContent } from '@/contexts/ContentContext';
import StoryFeed from '@/components/StoryFeed';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const HomePage = ({ onLoginRequest, isImmersiveMode, toggleImmersiveMode }) => {
  const { verticalPosts } = useContent();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Visibility State
  const [showStories, setShowStories] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const hideTimeoutRef = useRef(null);
  const touchStartRef = useRef(null);

  // --- Desktop Hover Logic ---

  // Called when mouse enters the header area or the invisible trigger zone
  const handleHeaderMouseEnter = () => {
    if (!isAtTop) return;
    if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
    }
    setShowStories(true);
  };

  // Called when mouse leaves the header area (moves down to content)
  const handleHeaderMouseLeave = () => {
    // Only apply auto-hide logic on desktop
    if (!isMobile) {
        hideTimeoutRef.current = setTimeout(() => {
            setShowStories(false);
        }, 300); // 0.3s delay
    }
  };

  // --- Mobile Swipe Logic ---

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartRef.current;
    
    // Threshold to avoid accidental triggers
    if (Math.abs(diff) > 20) {
        if (diff > 0) {
            // Swipe Down -> Show
            setShowStories(true);
        } else {
            // Swipe Up -> Hide
            setShowStories(false);
        }
        // Reset to prevent rapid toggling during same swipe
        touchStartRef.current = currentY;
    }
  };

  return (
    <>
      <Helmet>
        <title>The Homies Hub - For You</title>
        <meta name="description" content="Discover new travel stories and experiences." />
      </Helmet>
      
      <div className="flex flex-col h-full bg-black relative">
        
        {/* Immersive Mode Toggle (Visible when sidebar is hidden) */}
        {isImmersiveMode && (
             <div className="absolute top-4 left-0 z-50">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleImmersiveMode}
                    className="bg-black/30 hover:bg-black/50 text-white h-12 w-6 rounded-r-lg rounded-l-none backdrop-blur-md transition-colors border border-l-0 border-white/10 px-0 flex items-center justify-center"
                    title="Expand Sidebar"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        )}

        {/* 
            Smart Stories Header 
            - Removed Tabs (FilterBar) as requested.
            - Uses Absolute positioning to overlay content (no layout shift).
            - AnimatePresence for smooth slide in/out.
        */}
        {!isImmersiveMode && (
            <>
                {/* Invisible Trigger Zone at top for Desktop Hover */}
                {!isMobile && (
                    <div 
                        className="absolute top-0 left-0 right-0 h-6 z-40 bg-transparent" 
                        onMouseEnter={handleHeaderMouseEnter}
                    />
                )}

                <AnimatePresence>
                    {showStories && (
                        <motion.div 
                            className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/90 via-black/70 to-transparent pb-6"
                            initial={{ y: -120, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -120, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            onMouseEnter={handleHeaderMouseEnter}
                            onMouseLeave={handleHeaderMouseLeave}
                        >
                            {/* Inner container for styling consistency */}
                            <div className="bg-black/20 backdrop-blur-sm border-b border-white/5">
                                <StoryFeed />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        )}

        {/* 
            Content Area 
            - Handles touch events for mobile swipe detection.
            - Consumes full height; Stories overlay on top.
        */}
        <div 
            className="flex-1 min-h-0 w-full bg-black relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            <VerticalVideoFeed
                posts={verticalPosts}
                onLoginRequest={onLoginRequest}
                aspectRatio="vertical"
                onTopChange={(atTop) => { setIsAtTop(atTop); if (!atTop) setShowStories(false); }}
            />
        </div>
      </div>
    </>
  );
};

export default HomePage;