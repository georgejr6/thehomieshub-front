import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import VerticalVideoFeed from '@/components/VerticalVideoFeed';
import { useContent } from '@/contexts/ContentContext';
import StoryFeed from '@/components/StoryFeed';
import { Button } from '@/components/ui/button';
import { ChevronRight, Zap, X, CreditCard } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import cbApi from '@/api/centralbilling';

const HomePage = ({ onLoginRequest, isImmersiveMode, toggleImmersiveMode }) => {
  const { verticalPosts } = useContent();
  const { user, isPremium } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [upgradeDismissed, setUpgradeDismissed] = useState(
    () => sessionStorage.getItem('hh_upgrade_dismissed') === '1'
  );
  const showUpgradePill = user && !isPremium && !upgradeDismissed;

  const [portalLoading, setPortalLoading] = useState(false);

  const dismissUpgrade = () => {
    sessionStorage.setItem('hh_upgrade_dismissed', '1');
    setUpgradeDismissed(true);
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await cbApi.post('/billing/portal', { returnUrl: window.location.href });
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open('https://billing.stripe.com/p/login/7sIg1OahI5Yw7le4gg', '_blank', 'noopener,noreferrer');
    } finally {
      setPortalLoading(false);
    }
  };
  
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
                                {(showUpgradePill || user) && (
                                  <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-white/5">
                                    {showUpgradePill ? (
                                      <Link
                                        to="/settings"
                                        className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
                                      >
                                        <Zap className="w-3 h-3" />
                                        Upgrade — unlock media mode &amp; creator tools
                                      </Link>
                                    ) : (
                                      <span />
                                    )}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {user && (
                                        <button
                                          onClick={openBillingPortal}
                                          disabled={portalLoading}
                                          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors disabled:opacity-50"
                                        >
                                          <CreditCard className="w-3 h-3" />
                                          {portalLoading ? 'Opening…' : 'Manage billing'}
                                        </button>
                                      )}
                                      {showUpgradePill && (
                                        <button
                                          onClick={dismissUpgrade}
                                          className="text-white/30 hover:text-white/60 transition-colors"
                                          aria-label="Dismiss"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
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