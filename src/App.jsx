
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ThemeProvider } from '@/components/ThemeProvider';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import CommunitiesPage from '@/pages/CommunitiesPage';
import ExplorePage from '@/pages/ExplorePage';
import SubscriptionsPage from '@/pages/SubscriptionsPage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import UserProfilePage from '@/pages/UserProfilePage';
import GoLivePage from '@/pages/GoLivePage';
import LiveStreamPage from '@/pages/LiveStreamPage';
import LivePage from '@/pages/LivePage';
import LibraryPage from '@/pages/LibraryPage';
import CreatorStudioPage from '@/pages/CreatorStudioPage';
import AccountSettingsPage from '@/pages/AccountSettingsPage';
import InboxPage from '@/pages/InboxPage';
import MyAIPage from '@/pages/MyAIPage';
import AuthModal from '@/components/AuthModal';
import PostModal from '@/components/PostModal';
import FeatureLockedModal from '@/components/FeatureLockedModal';
import PlaceView from '@/components/PlaceView';
import MediaApp from '@/components/MediaMode/MediaApp';
import MusicPlayer from '@/components/MediaMode/MusicPlayer';
import WalletIsolationMode from '@/components/WalletIsolationMode';
import WagersPage from '@/pages/WagersPage';
import WagerDetailPage from '@/pages/WagerDetailPage';
import { WagerProvider } from '@/contexts/WagerContext';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminContent from '@/pages/admin/AdminContent';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminMonetization from '@/pages/admin/AdminMonetization';
import AdminFeatures from '@/pages/admin/AdminFeatures';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/pages/admin/AdminLayout';
import TermsPage from '@/pages/TermsPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import CommunityGuidelinesPage from '@/pages/CommunityGuidelinesPage';
import BackButton from '@/components/BackButton';

import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import FeatureGuard from '@/components/FeatureGuard';
import WatchPage from './pages/WatchPage';

// --- Layout Components ---

const MainLayout = ({ 
  authModalState, setAuthModalState, 
  isSidebarOpen, setSidebarOpen, 
  isSidebarCollapsed, setSidebarCollapsed, 
  isImmersiveMode, toggleImmersiveMode, 
  handleLoginRequest, handleOpenPostModal 
}) => {
  const location = useLocation();
  const shouldHideHeader = isImmersiveMode;
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Swipe Detection Logic
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchEnd.current = null; 
    touchStart.current = e.targetTouches[0].clientX;
  }

  const onTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  }

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // Only apply on mobile
    if (isMobile) {
      if (isRightSwipe) {
        // Swipe Right -> Open Menu
        setSidebarOpen(true);
      } else if (isLeftSwipe) {
        // Swipe Left -> Close Menu
        setSidebarOpen(false);
      }
    }
  }

  return (
    <div 
      className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col md:block overscroll-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Desktop Header */}
      {!shouldHideHeader && !isMobile && (
        <Header 
            onLoginClick={() => setAuthModalState({ isOpen: true, view: 'main' })} 
            onMenuClick={() => setSidebarOpen(!isSidebarOpen)} 
            onToggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
            isSidebarCollapsed={isSidebarCollapsed}
            onLoginRequest={handleLoginRequest}
        />
      )}

      {/* Mobile Header */}
       {isMobile && !shouldHideHeader && (
          <Header 
            onLoginClick={() => setAuthModalState({ isOpen: true, view: 'main' })} 
            onMenuClick={() => setSidebarOpen(!isSidebarOpen)} 
            onLoginRequest={handleLoginRequest}
            isMobile={true}
          />
       )}

      <div className={cn(
          "flex flex-1 overflow-hidden h-full relative", 
          shouldHideHeader ? "pt-0" : "pt-14 md:pt-14"
      )}>
         {/* Sidebar - Handles both Desktop (Static) and Mobile (Drawer) modes internally */}
         {!isImmersiveMode && (
            <Sidebar 
                isMobileOpen={isSidebarOpen} 
                onMobileClose={() => setSidebarOpen(false)}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setSidebarCollapsed}
                onPostClick={handleOpenPostModal}
                toggleImmersiveMode={toggleImmersiveMode}
                isMobile={isMobile}
            />
         )}
         
        <main className={cn(
            "flex-1 transition-all duration-300 overflow-y-auto w-full flex flex-col",
            // Desktop padding/margin
            !isMobile && !shouldHideHeader && "h-[calc(100vh-3.5rem)]", 
            !isMobile && !isImmersiveMode && (isSidebarCollapsed ? "ml-20" : "ml-64"),
            !isMobile && isImmersiveMode && "ml-0 pb-0 h-[100vh]",

            // Mobile specific layout
            isMobile && "pb-16 h-[calc(100vh-3.5rem)]", 
            isMobile && shouldHideHeader && "pb-0 h-[100vh]", 
            
            // Live stream specific
            location.pathname.startsWith('/live-stream') && "ml-0 h-[calc(100vh-3.5rem)] pb-0" 
        )}>
          <div className="flex-1">
             <Outlet />
          </div>
          {!isImmersiveMode && !location.pathname.startsWith('/live-stream') && <Footer />}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && !shouldHideHeader && (
        <MobileNav 
          onPostClick={() => handleOpenPostModal()} 
          onLoginRequest={handleLoginRequest} 
          onMenuClick={() => setSidebarOpen(true)}
        />
      )}

      <MusicPlayer />
    </div>
  );
};

const MediaLayout = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Outlet />
      <MusicPlayer />
    </div>
  );
};

const WalletLayout = () => {
  return (
    <div className="min-h-screen bg-black text-white relative">
       <div className="absolute top-4 left-4 z-50">
          <BackButton className="text-white hover:bg-white/20" />
      </div>
      <Outlet />
    </div>
  );
};

const StudioLayout = ({ handleLoginRequest }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
};

const AppContent = React.memo(() => {
  const [authModalState, setAuthModalState] = useState({ isOpen: false, view: 'main' });
  const [isPostModalOpen, setPostModalOpen] = useState(false);
  const [postModalType, setPostModalType] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  
  const { user, loading, isLockedModalOpen, setIsLockedModalOpen, isPremium } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      setAuthModalState(prev => ({ ...prev, isOpen: false }));
    }
  }, [user]);

  useEffect(() => {
    setIsImmersiveMode(false);
  }, [location.pathname]);
  
  const handleOpenPostModal = (type = null) => {
    if (!user) {
      handleLoginRequest();
      return;
    }
    if (!isPremium) {
        setIsLockedModalOpen(true);
        return;
    }
    if (type === 'live') {
      setPostModalOpen(false);
      navigate('/studio/stream');
    } else {
      setPostModalType(type);
      setPostModalOpen(true);
    }
  };
  
  const handleLoginRequest = () => {
    if (!user) {
      setAuthModalState({ isOpen: true, view: 'main' });
    }
  }

  const handleUpgradeRequest = () => {
    if (user && !isPremium) {
        navigate('/subscriptions');
    } else if (!user) {
        handleLoginRequest();
    }
  }
  
  const isAdminOrMod = user && (user.isAdmin || user.isModerator);
  
  const AdminRouteWrapper = ({ children }) => {
      if (!isAdminOrMod) return <Navigate to="/" />;
      return <AdminLayout>{children}</AdminLayout>;
  };

  return (
    <WagerProvider>
    <ThemeProvider defaultTheme="dark" storageKey="homies-hub-theme">
        <Helmet>
            <title>The Homies Hub</title>
            <meta name="description" content="A social community for men sharing their experiences." />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" /> 
        </Helmet>
        
        <Routes>
            {/* --- Media Mode Routes --- */}
            <Route path="/media" element={<MediaLayout />}>
                <Route index element={<MediaApp />} />
                <Route path=":postId" element={<MediaApp />} />
            </Route>
            
            {/* --- My AI Route (Guarded) CHANGED to /AI --- */}
            <Route path="/AI" element={
                <FeatureGuard feature="my_ai">
                    <MyAIPage />
                </FeatureGuard>
            } />

            {/* --- Wallet Mode Routes (Guarded) --- */}
            <Route path="/wallet" element={
                <FeatureGuard feature="wallet">
                    <WalletLayout />
                </FeatureGuard>
            }>
                <Route index element={<WalletIsolationMode activeTab="overview" />} />
                <Route path="purchase" element={<WalletIsolationMode activeTab="purchase" />} />
                <Route path="earnings" element={<WalletIsolationMode activeTab="earnings" />} />
                <Route path="transactions" element={<WalletIsolationMode activeTab="transactions" />} />
                <Route path="moments" element={<WalletIsolationMode activeTab="moments" />} />
                <Route path="settings" element={<WalletIsolationMode activeTab="settings" />} />
            </Route>

            {/* --- Creator Studio Routes --- */}
            <Route path="/studio" element={<StudioLayout handleLoginRequest={handleLoginRequest} />}>
                <Route index element={isPremium ? <CreatorStudioPage onLoginRequest={handleLoginRequest} /> : <Navigate to="/subscriptions" />} />
                <Route path="stream" element={isPremium ? <GoLivePage onLoginRequest={handleLoginRequest} /> : <Navigate to="/subscriptions" />} />
            </Route>

            {/* --- Admin Routes --- */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminRouteWrapper><AdminDashboard /></AdminRouteWrapper>} />
            <Route path="/admin/content" element={<AdminRouteWrapper><AdminContent /></AdminRouteWrapper>} />
            <Route path="/admin/users" element={<AdminRouteWrapper><AdminUsers /></AdminRouteWrapper>} />
            <Route path="/admin/monetization" element={user?.isAdmin ? <AdminRouteWrapper><AdminMonetization /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/features" element={user?.isAdmin ? <AdminRouteWrapper><AdminFeatures /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />

            {/* --- Main App Routes --- */}
            <Route element={<MainLayout 
                authModalState={authModalState}
                setAuthModalState={setAuthModalState}
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
                isSidebarCollapsed={isSidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                isImmersiveMode={isImmersiveMode}
                toggleImmersiveMode={() => setIsImmersiveMode(!isImmersiveMode)}
                handleLoginRequest={handleLoginRequest}
                handleOpenPostModal={handleOpenPostModal}
            />}>
                <Route path="/" element={<HomePage onLoginRequest={handleLoginRequest} isImmersiveMode={isImmersiveMode} toggleImmersiveMode={() => setIsImmersiveMode(!isImmersiveMode)} />} />
                
                <Route path="/explore" element={
                    <FeatureGuard feature="explore">
                        <ExplorePage onLoginRequest={handleLoginRequest} />
                    </FeatureGuard>
                } />
                
                <Route path="/live" element={
                    <FeatureGuard feature="live_streaming">
                        <LivePage onLoginRequest={handleLoginRequest} />
                    </FeatureGuard>
                } />
                
                <Route path="/live-stream/:id" element={
                    <FeatureGuard feature="live_streaming">
                        <LiveStreamPage onLoginRequest={handleLoginRequest} />
                    </FeatureGuard>
                } />
                
                <Route path="/library" element={
                    <FeatureGuard feature="library">
                        <LibraryPage onUpgradeRequest={handleUpgradeRequest} onLoginRequest={handleLoginRequest} onPostClick={handleOpenPostModal} />
                    </FeatureGuard>
                } />
                
                <Route path="/communities" element={<CommunitiesPage />} />
                <Route path="/wagers" element={<WagersPage onLoginRequest={handleLoginRequest} />} />
                <Route path="/wagers/:id" element={<WagerDetailPage onLoginRequest={handleLoginRequest} />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                
                <Route path="/search" element={
                    <FeatureGuard feature="search">
                        <SearchResultsPage />
                    </FeatureGuard>
                } />
                
                <Route path="/inbox" element={
                    <FeatureGuard feature="messaging">
                        {user ? <InboxPage /> : <Navigate to="/" />}
                    </FeatureGuard>
                } />
                
                <Route path="/profile/:username" element={<UserProfilePage />} />
                <Route path="/post/:postId" element={<HomePage onLoginRequest={handleLoginRequest} />} /> 
                <Route path="/watch/:postId" element={<WatchPage onLoginRequest={handleLoginRequest} />} />
                
                <Route path="/settings" element={user ? <AccountSettingsPage /> : <Navigate to="/" />} />
                <Route path="/settings/account" element={user ? <AccountSettingsPage activeTab="account" /> : <Navigate to="/" />} />
                <Route path="/settings/notifications" element={user ? <AccountSettingsPage activeTab="notifications" /> : <Navigate to="/" />} />
                <Route path="/settings/privacy" element={user ? <AccountSettingsPage activeTab="privacy" /> : <Navigate to="/" />} />

                {/* Legal Routes */}
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />

                <Route path="/creator-studio" element={<Navigate to="/studio" replace />} />
                <Route path="/go-live" element={<Navigate to="/studio/stream" replace />} />
            </Route>
        </Routes>

        <AuthModal 
            isOpen={authModalState.isOpen} 
            onOpenChange={(isOpen) => setAuthModalState(prev => ({ ...prev, isOpen }))} 
            initialView={authModalState.view}
        />
        
        {/* Guard Post Modal creation */}
        <FeatureGuard feature="create_post" fallback={null}>
            <PostModal isOpen={isPostModalOpen} onOpenChange={setPostModalOpen} initialPostType={postModalType} />
        </FeatureGuard>

        <FeatureLockedModal 
            isOpen={isLockedModalOpen} 
            onOpenChange={setIsLockedModalOpen}
        />
        <PlaceView />
        <Toaster />
    </ThemeProvider>
    </WagerProvider>
  );
});

function App() {
  return <AppContent />;
}

export default App;
