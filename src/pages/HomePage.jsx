import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import VerticalVideoFeed from '@/components/VerticalVideoFeed';
import { useContent } from '@/contexts/ContentContext';
import StoryFeed from '@/components/StoryFeed';
import { Button } from '@/components/ui/button';
import { ChevronRight, Zap, X, CreditCard, Globe, Clock, ArrowRight } from 'lucide-react';
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

                                {/* ── Consultation booking section ── */}
                                <div className="px-4 py-3 border-t border-white/5 space-y-2">
                                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                    <Globe className="w-3 h-3" />Book a 1-on-1 travel &amp; lifestyle consult
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {/* 30-min */}
                                    <a
                                      href="https://buy.stripe.com/5kQfZgbadeo24Rvgdkf7i0f"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 p-3 flex flex-col gap-2 transition-all"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="w-3 h-3 text-white/50" />
                                          <span className="text-[11px] text-white/60 font-medium">30 min</span>
                                        </div>
                                        <span className="text-xs font-bold text-yellow-400">Book →</span>
                                      </div>
                                      <p className="text-xs font-semibold text-white leading-tight">Travel Consult</p>
                                      <p className="text-[10px] text-white/40 leading-snug">Colombia · Peru · Thailand · London · Amsterdam &amp; more</p>
                                      <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                                        Book now <ArrowRight className="w-2.5 h-2.5" />
                                      </span>
                                    </a>
                                    {/* 1-hour */}
                                    <a
                                      href="https://buy.stripe.com/aFa5kCemp3Jo3Nr4uCf7i0g"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group rounded-lg border border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500/50 p-3 flex flex-col gap-2 transition-all"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <Clock className="w-3 h-3 text-yellow-500/70" />
                                          <span className="text-[11px] text-yellow-500/80 font-medium">1 hour</span>
                                        </div>
                                        <span className="text-xs font-bold text-yellow-400">Book →</span>
                                      </div>
                                      <p className="text-xs font-semibold text-white leading-tight">Deep Dive Consult</p>
                                      <p className="text-[10px] text-white/40 leading-snug">Digital nomad · Living abroad · AI income · Build your biz</p>
                                      <span className="text-[10px] text-yellow-400 font-semibold flex items-center gap-1 group-hover:gap-1.5 transition-all">
                                        Book now <ArrowRight className="w-2.5 h-2.5" />
                                      </span>
                                    </a>
                                  </div>
                                </div>
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