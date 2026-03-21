
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, Users, Clapperboard, PanelLeft, PanelRight, Plus, Radio, Library, ShieldCheck, LayoutDashboard, FolderKanban, Zap, Crown, Menu, Music, ChevronLeft, ChevronRight, Bot, X, Maximize, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMedia } from '@/contexts/MediaContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import api from '@/api/homieshub';

const NavItem = ({ to, icon: Icon, label, isCollapsed, featureKey, onClick, liveDot }) => {
  const location = useLocation();
  const { checkAccess } = useFeatures();
  const isActive = location.pathname === to || (to === '/live' && location.pathname.startsWith('/live-stream')) || (to === '/admin/dashboard' && location.pathname.startsWith('/admin'));

  if (featureKey) {
      const { status } = checkAccess(featureKey);
      if (status === 'hidden') return null;
  }

  return (
    <NavLink to={to} onClick={onClick}>
      <motion.div
        className={cn(
          "flex items-center w-full h-12 px-4 rounded-lg cursor-pointer transition-colors",
          isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isCollapsed ? "justify-center" : ""
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative shrink-0">
          <Icon className={cn("h-6 w-6", isActive ? "text-primary" : liveDot ? "text-red-500" : "text-muted-foreground")} />
          {liveDot && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            </span>
          )}
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className={cn("font-medium whitespace-nowrap ml-4", isActive ? "text-primary" : "text-foreground")}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </NavLink>
  );
};

const Sidebar = ({ isMobileOpen, onMobileClose, isCollapsed, setIsCollapsed, onPostClick, toggleImmersiveMode, isMobile }) => {
  const { user, isPremium, triggerLockedFeature } = useAuth();
  const { showWarning, confirmEnterMediaMode, cancelEnterMediaMode, enterMediaMode, hasEnteredMediaMode, isPlaying, currentTrack } = useMedia();
  const isMediaActive = hasEnteredMediaMode && !!currentTrack;
  const { checkAccess } = useFeatures();
  const location = useLocation();
  const isLivestreamPage = location.pathname.startsWith('/live-stream');

  const [hasActiveLive, setHasActiveLive] = useState(false);
  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await api.get('/live/active');
        setHasActiveLive((data?.result?.streams?.length || 0) > 0);
      } catch (_) {}
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Base items for everyone
  const mainNavItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/explore', icon: Compass, label: 'Explore', featureKey: 'explore' },
    { to: '/live', icon: Radio, label: 'Live', featureKey: 'live_streaming', liveDot: hasActiveLive },
    { to: '/library', icon: Library, label: 'Library', featureKey: 'library' },
    { to: '/communities', icon: Users, label: 'Communities' },
    { to: '/wagers', icon: Swords, label: 'Wagers' },
  ];

  if (user) {
    mainNavItems.push({ to: '/subscriptions', icon: Clapperboard, label: 'Subscriptions' });
    
    if (isPremium) {
        mainNavItems.push({ to: '/studio', icon: Zap, label: 'Creator Studio' });
    }
  }
  
  const adminNavItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/content', icon: FolderKanban, label: 'Content' },
    { to: '/admin/users', icon: Users, label: 'Users' },
  ];

  const handleUpgradeClick = () => {
    triggerLockedFeature();
  };

  const createPostAccess = checkAccess('create_post');

  const MediaModeButton = () => (
    <motion.button
        onClick={enterMediaMode}
        className={cn(
          "flex items-center w-full h-12 px-4 rounded-lg cursor-pointer transition-colors hover:bg-accent relative",
          isMediaActive ? "text-red-500" : "text-muted-foreground hover:text-red-500",
          isCollapsed && !isMobile ? "justify-center" : ""
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
    >
        {/* Pulsing glow when media is minimized and active */}
        {isMediaActive && (
          <motion.span
            className="absolute left-4 w-6 h-6 rounded-full bg-red-500/30"
            animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <motion.div
          animate={isMediaActive && isPlaying ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.8, repeat: isMediaActive && isPlaying ? Infinity : 0, ease: 'easeInOut' }}
          className="relative z-10"
        >
          <Music className="h-6 w-6" />
        </motion.div>
        <AnimatePresence>
          {(!isCollapsed || isMobile) && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="font-medium whitespace-nowrap ml-4 relative z-10"
            >
              {isMediaActive ? 'Now Playing' : 'Media Mode'}
            </motion.span>
          )}
        </AnimatePresence>
    </motion.button>
  );

  const desktopSidebarContent = (
    <div className="flex flex-col h-full relative bg-background">
        {/* Mobile Close Button */}
        {isMobile && (
            <div className="flex justify-between items-center p-4 border-b">
                 <span className="font-bold text-lg">Menu</span>
                <Button variant="ghost" size="icon" onClick={onMobileClose}>
                    <X className="h-6 w-6" />
                </Button>
            </div>
        )}

      <nav className="px-2 space-y-2 mt-1 flex-1 overflow-y-auto pb-48 no-scrollbar">
        {mainNavItems.map(item => (
          <NavItem 
            key={item.to} 
            {...item} 
            isCollapsed={isMobile ? false : isCollapsed} 
            onClick={isMobile ? onMobileClose : undefined}
          />
        ))}
        
        <div className="my-2 border-t border-border/50 mx-2" />
        
        <MediaModeButton />
        
        <NavItem 
            to="/AI" 
            icon={Bot} 
            label="AI" 
            isCollapsed={isMobile ? false : isCollapsed}
            featureKey="my_ai"
            onClick={isMobile ? onMobileClose : undefined}
        />

        {/* Mobile Specific Bottom Items */}
        {isMobile && (
            <>
                <button
                    onClick={() => { toggleImmersiveMode(); onMobileClose(); }}
                    className="flex items-center w-full h-12 px-4 rounded-lg cursor-pointer transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <Maximize className="h-6 w-6" />
                    <span className="font-medium whitespace-nowrap ml-4">Immersive Mode</span>
                </button>
                <button
                     onClick={onMobileClose}
                     className="flex items-center w-full h-12 px-4 rounded-lg cursor-pointer transition-colors text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                    <PanelLeft className="h-6 w-6" />
                    <span className="font-medium whitespace-nowrap ml-4">Collapse Sidebar</span>
                </button>
            </>
        )}

        {user && !isPremium && (
            <div className="px-2 mt-2">
                 <Button 
                    onClick={handleUpgradeClick} 
                    className={cn(
                        "w-full gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 border-none text-white shadow-glow-gold-sm", 
                        (isCollapsed && !isMobile) ? "px-0 justify-center" : "justify-start px-4"
                    )}
                    variant="default"
                    size={(isCollapsed && !isMobile) ? "icon" : "default"}
                 >
                    <Crown className="h-4 w-4" />
                    {(!isCollapsed || isMobile) && "Become a Creator"}
                 </Button>
            </div>
        )}

        {user?.isAdmin && (
            <>
                <div className="px-4 pt-4 pb-2">
                    {(!isCollapsed || isMobile) && <span className="text-xs font-semibold text-muted-foreground uppercase">Admin</span>}
                    {(isCollapsed && !isMobile) && <ShieldCheck className="h-6 w-6 mx-auto text-muted-foreground" />}
                </div>
                {adminNavItems.map(item => (
                    <NavItem 
                        key={item.to} 
                        {...item} 
                        isCollapsed={isMobile ? false : isCollapsed}
                        onClick={isMobile ? onMobileClose : undefined}
                    />
                ))}
            </>
        )}
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-background border-t z-10 pb-safe">
         <div className="flex flex-col items-center justify-center gap-4 my-4">
            {createPostAccess.status !== 'hidden' && (
                <Button 
                    onClick={() => { onPostClick(); if(isMobile) onMobileClose(); }} 
                    size="icon" 
                    className="w-12 h-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 shadow-glow-gold"
                    disabled={createPostAccess.status === 'blurred'} 
                    title={createPostAccess.status === 'blurred' ? createPostAccess.message : "Create"}
                >
                    <Plus className="h-6 w-6" />
                </Button>
            )}
        </div>
        
        {/* Only show desktop controls on desktop */}
        {!isMobile && (
            <div className="pt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleImmersiveMode}
                    className={cn(
                        "w-full flex items-center gap-2 text-muted-foreground hover:text-foreground mb-1",
                        isCollapsed ? "justify-center px-0" : "justify-start px-4"
                    )}
                    title="Toggle Immersive Mode"
                >
                    {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    {!isCollapsed && <span className="font-medium">Immersive Mode</span>}
                </Button>
                
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-accent-foreground" onClick={() => setIsCollapsed(!isCollapsed)}>
                    {isCollapsed ? <PanelRight className="h-6 w-6 mx-auto" /> : <div className="flex items-center"><PanelLeft className="mr-4 h-6 w-6" /><span>Collapse Sidebar</span></div>}
                </Button>
            </div>
        )}
      </div>
    </div>
  );

  if (isLivestreamPage) {
    return null;
  }

  // Mobile specific: Drawer Overlay
  if (isMobile) {
      return (
        <AnimatePresence>
            {isMobileOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/80 z-[60] backdrop-blur-sm"
                        onClick={onMobileClose}
                    />
                    
                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed inset-y-0 left-0 w-3/4 max-w-[300px] bg-background z-[70] shadow-xl border-r border-border h-full"
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={{ left: 0.2, right: 0 }}
                        onDragEnd={(e, { offset, velocity }) => {
                             // Swipe left to close logic on the drawer itself
                             if (offset.x < -100 || velocity.x < -100) {
                                 onMobileClose();
                             }
                        }}
                    >
                        {desktopSidebarContent}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
      );
  }

  // Desktop Static Sidebar
  return (
    <>
      <Dialog open={showWarning} onOpenChange={cancelEnterMediaMode}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Media Mode?</DialogTitle>
            <DialogDescription>
              You are about to enter Media Mode. This will hide standard app content and focus on streaming video and music. You can minimize it to browse later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelEnterMediaMode}>Cancel</Button>
            <Button onClick={confirmEnterMediaMode} className="bg-red-500 hover:bg-red-600 text-white">Enter Media Mode</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <aside className={cn(
        "hidden md:fixed md:top-14 md:left-0 md:h-[calc(100vh-3.5rem)] md:flex md:flex-col md:bg-background md:border-r transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}>
        {desktopSidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
