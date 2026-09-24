
import React, { useState, useEffect, useRef, Suspense } from 'react';
import lazyWithReload from '@/lib/lazyWithReload';
import { Routes, Route, useLocation, Navigate, useNavigate, Outlet, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ThemeProvider } from '@/components/ThemeProvider';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import Footer from '@/components/Footer';
import GetAppBanner from '@/components/GetAppBanner';
import GetAppSignedOutModal from '@/components/GetAppSignedOutModal';
const HomePage = lazyWithReload(() => import('@/pages/HomePage'));
const InvitePage = lazyWithReload(() => import('@/pages/InvitePage'));
const CommunitiesPage = lazyWithReload(() => import('@/pages/CommunitiesPage'));
const ExplorePage = lazyWithReload(() => import('@/pages/ExplorePage'));
const SubscriptionsPage = lazyWithReload(() => import('@/pages/SubscriptionsPage'));
const SearchResultsPage = lazyWithReload(() => import('@/pages/SearchResultsPage'));
const UserProfilePage = lazyWithReload(() => import('@/pages/UserProfilePage'));
import LiveComingSoon from '@/components/LiveComingSoon';
const LibraryPage = lazyWithReload(() => import('@/pages/LibraryPage'));
// Re-enabled 2026-08-10 -- Creator Studio (content mgmt + analytics + ecommerce) is live again.
const CreatorStudioPage = lazyWithReload(() => import('@/pages/CreatorStudioPage'));
const TripsPage = lazyWithReload(() => import('@/pages/TripsPage'));
const AccountSettingsPage = lazyWithReload(() => import('@/pages/AccountSettingsPage'));
const InboxPage = lazyWithReload(() => import('@/pages/InboxPage'));
const ChatPage = lazyWithReload(() => import('@/pages/ChatPage'));
const MyAIPage = lazyWithReload(() => import('@/pages/MyAIPage'));
const MyClipsPage = lazyWithReload(() => import('@/pages/MyClipsPage'));
const MyAppsPage = lazyWithReload(() => import('@/pages/MyAppsPage'));
import AuthModal from '@/components/AuthModal';
import PostModal from '@/components/PostModal';
import FeatureLockedModal from '@/components/FeatureLockedModal';
import PlaceView from '@/components/PlaceView';
const MediaApp = lazyWithReload(() => import('@/components/MediaMode/MediaApp'));
import MusicPlayer from '@/components/MediaMode/MusicPlayer';
const SongPage = lazyWithReload(() => import('@/components/MediaMode/SongPage'));
const WalletIsolationMode = lazyWithReload(() => import('@/components/WalletIsolationMode'));
const WagersPage = lazyWithReload(() => import('@/pages/WagersPage'));
const WagerDetailPage = lazyWithReload(() => import('@/pages/WagerDetailPage'));
import { WagerProvider } from '@/contexts/WagerContext';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
const AdminDashboard = lazyWithReload(() => import('@/pages/admin/AdminDashboard'));
const AdminContent = lazyWithReload(() => import('@/pages/admin/AdminContent'));
const AdminUsers = lazyWithReload(() => import('@/pages/admin/AdminUsers'));
const AdminVisitors = lazyWithReload(() => import('@/pages/admin/AdminVisitors'));
const AdminMonetization = lazyWithReload(() => import('@/pages/admin/AdminMonetization'));
const AdminFeatures = lazyWithReload(() => import('@/pages/admin/AdminFeatures'));
const AdminInvite = lazyWithReload(() => import('@/pages/admin/AdminInvite'));
const AdminLogin = lazyWithReload(() => import('@/pages/admin/AdminLogin'));
const AdminLayout = lazyWithReload(() => import('@/pages/admin/AdminLayout'));
const AdminMediaManager = lazyWithReload(() => import('@/pages/admin/AdminMediaManager'));
const AdminMusicManager = lazyWithReload(() => import('@/pages/admin/AdminMusicManager'));
const AdminAnalytics = lazyWithReload(() => import('@/pages/admin/AdminAnalytics'));
const AdminEngagement = lazyWithReload(() => import('@/pages/admin/AdminEngagement'));
const AdminRevenue = lazyWithReload(() => import('@/pages/admin/AdminRevenue'));
const AdminPayouts = lazyWithReload(() => import('@/pages/admin/AdminPayouts'));
const AdminPushNotifications = lazyWithReload(() => import('@/pages/admin/AdminPushNotifications'));
const AdminBanners = lazyWithReload(() => import('@/pages/admin/AdminBanners'));
const AdminModeration = lazyWithReload(() => import('@/pages/admin/AdminModeration'));
const TermsPage = lazyWithReload(() => import('@/pages/TermsPage'));
const ResetPasswordPage = lazyWithReload(() => import('@/pages/ResetPasswordPage'));
const PrivacyPolicyPage = lazyWithReload(() => import('@/pages/PrivacyPolicyPage'));
const CommunityGuidelinesPage = lazyWithReload(() => import('@/pages/CommunityGuidelinesPage'));
const ChildSafetyPage = lazyWithReload(() => import('@/pages/ChildSafetyPage'));
const SupportPage = lazyWithReload(() => import('@/pages/SupportPage'));
import LandingPage from '@/pages/LandingPage';
const MembershipsPage = lazyWithReload(() => import('@/pages/MembershipsPage'));
const BillingPage = lazyWithReload(() => import('@/pages/BillingPage'));
const ConsultationPage = lazyWithReload(() => import('@/pages/ConsultationPage'));
import ConnectMembershipBanner from '@/components/ConnectMembershipBanner';
const MarketplacePage = lazyWithReload(() => import('@/pages/MarketplacePage'));
const PurchasesPage = lazyWithReload(() => import('@/pages/PurchasesPage'));
import BackButton from '@/components/BackButton';
import OnboardingFlow from '@/components/OnboardingFlow';
import DiscordConnectPrompt from '@/components/DiscordConnectPrompt';
const PayPage = lazyWithReload(() => import('@/pages/PayPage'));
import api from '@/api/homieshub';

import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import FeatureGuard from '@/components/FeatureGuard';
import { useStory } from '@/contexts/StoryContext';
const StoryViewer = lazyWithReload(() => import('@/components/StoryViewer'));
const WatchPage = lazyWithReload(() => import('./pages/WatchPage'));
const OAuthCallbackPage = lazyWithReload(() => import('@/pages/OAuthCallbackPage'));
const JoinGatePage = lazyWithReload(() => import('@/pages/JoinGatePage'));
const FundyPage = lazyWithReload(() => import('@/pages/FundyPage'));
import EmailVerifyGate from '@/components/EmailVerifyGate';
import RouteTracker from '@/components/RouteTracker';
import HelpAssistant from '@/components/HelpAssistant';
import LocationGate from '@/components/LocationGate';
import { MembershipGate, BannedScreen } from '@/components/MembershipWall';
import JoinInviteModal from '@/components/JoinInviteModal';
import { isLocationVerified } from '@/lib/tracker';

// Routes reachable without a verified location — everything else in
// MainLayout requires it for logged-out visitors (see LocationGate). Kept to
// the entry point + legally-required pages so people can still learn what
// the site is and reach required disclosures before being asked for it.
const LOCATION_GATE_EXEMPT_PATHS = new Set([
  '/', '/terms', '/privacy', '/community-guidelines', '/child-safety', '/support',
]);

// chat.thehomies.app / community.thehomies.app / discord.thehomies.app all
// serve this same app; on those hosts the home page is the chat.
const CHAT_HOSTS = /^(chat|community|discord)\./i;
const ChatHostRedirect = () => {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (CHAT_HOSTS.test(window.location.hostname) && location.pathname === '/') navigate('/chat', { replace: true });
  }, [location.pathname, navigate]);
  return null;
};

// --- Route loading fallback ---
// Pages are code-split (React.lazy) so the first paint only downloads the
// shell; this is what shows for the split second a page chunk is loading.
// `dark` matches the chat's own background so /chat doesn't flash.
const RouteFallback = ({ dark = false, full = false }) => (
  <div
    className={cn('flex w-full items-center justify-center', full ? 'min-h-screen' : 'min-h-[50vh]', dark ? 'bg-[#313338]' : 'bg-transparent')}
    role="status"
    aria-label="Loading"
  >
    <span className={cn('h-7 w-7 animate-spin rounded-full border-2 border-t-transparent', dark ? 'border-[#949BA4]' : 'border-muted-foreground/60')} />
  </div>
);

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
  

  return (
    <div 
      className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col md:block overscroll-none"
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
          {!isImmersiveMode && <ConnectMembershipBanner />}
          {!isImmersiveMode && <GetAppBanner />}
          {!isImmersiveMode && <GetAppSignedOutModal />}
          <div className="flex-1">
             <Suspense fallback={<RouteFallback />}>
               {LOCATION_GATE_EXEMPT_PATHS.has(location.pathname) ? (
                 <Outlet />
               ) : (
                 <LocationGate><Outlet /></LocationGate>
               )}
             </Suspense>
          </div>
          {!isImmersiveMode && !location.pathname.startsWith('/live-stream') && location.pathname !== '/browse' && location.pathname !== '/' && <Footer />}
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
      <Suspense fallback={<RouteFallback full />}>
        <Outlet />
      </Suspense>
      <MusicPlayer />
    </div>
  );
};

const WalletLayout = () => {
  // BUG FIX: this page is the destination of the mobile app's wallet-connect
  // browser sheet (WalletContext.tsx's connectAlgoWallet), which is a fresh
  // browser context with no session -- previously the user landed here
  // logged out and had to sign in a second time before they could do
  // anything. Mobile passes a short-lived single-use handoff code via
  // ?code=, exchanged here for a real session token via the same
  // /auth/handoff-exchange endpoint PayPage.jsx uses.
  //
  // SECURITY: this used to pass the mobile app's real access token directly
  // as ?token= -- a review found that gets permanently logged (analytics
  // DB, admin Visitors panel, CDN access logs). A handoff code is worthless
  // once used/expired, so it leaking the same way is a non-issue.
  const [searchParams, setSearchParams] = useSearchParams();
  const { setAccessToken } = useAuth();
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) return;
    (async () => {
      try {
        const resp = await api.post('/auth/handoff-exchange', { code });
        const token = resp?.data?.result?.access_token;
        if (token) await setAccessToken(token);
      } catch { /* fall back to the normal signed-out wallet page */ }
    })();
    searchParams.delete('code');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative">
       <div className="absolute top-4 left-4 z-50">
          <BackButton className="text-white hover:bg-white/20" />
      </div>
      <Suspense fallback={<RouteFallback full />}>
        <Outlet />
      </Suspense>
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

const JOIN_INVITE_KEY = 'hh_join_invite_last_shown';
const JOIN_INVITE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // don't nag more than once/day
const JOIN_INVITE_DELAY_MS = 45 * 1000; // "eventually" — after a bit of browsing, not on arrival

const AppContent = React.memo(() => {
  const [authModalState, setAuthModalState] = useState({ isOpen: false, view: 'main', tab: 'signin' });
  const [isPostModalOpen, setPostModalOpen] = useState(false);
  const [postModalType, setPostModalType] = useState(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [showJoinInvite, setShowJoinInvite] = useState(false);

  const { user, loading, isLockedModalOpen, setIsLockedModalOpen, isPremium, showOnboarding, stopTutorial, showDiscordPrompt, dismissDiscordPrompt } = useAuth();
  const { orderedStories, viewingIndex, closeStory } = useStory();
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

  // Soft, dismissible join nudge for logged-out visitors who are already
  // browsing freely (location already verified, so this never stacks on top
  // of LocationGate) — throttled to once/day, never shown on /join itself.
  useEffect(() => {
    if (user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled || location.pathname === '/join') return;
      if (!isLocationVerified()) return;
      try {
        const last = Number(localStorage.getItem(JOIN_INVITE_KEY) || 0);
        if (Date.now() - last < JOIN_INVITE_COOLDOWN_MS) return;
        localStorage.setItem(JOIN_INVITE_KEY, String(Date.now()));
      } catch { /* ignore */ }
      setShowJoinInvite(true);
    }, JOIN_INVITE_DELAY_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [user]);

  // Open auth modal when gate redirects with ?openAuth=1&tab=signin|signup
  // Also silently strip the ?_direct=1 OG-bypass marker added by Vercel rewrites
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // Announcement sign-up links carry ?redirect=<path> — remember it so we can
    // drop the user there right after they authenticate.
    const redirect = params.get('redirect');
    if (redirect) {
      localStorage.setItem('post_auth_redirect', redirect);
      localStorage.setItem('post_auth_redirect_ts', String(Date.now()));
    }
    if (params.get('openAuth') === '1') {
      const tab = params.get('tab') || 'signin';
      setAuthModalState({ isOpen: true, view: 'main', tab });
      window.history.replaceState({}, '', location.pathname);
    } else if (params.has('_direct') || redirect) {
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search]);

  // After a fresh login (any method), honor a pending announcement redirect.
  // Timestamp-guarded so a stale value can't redirect on a normal page load.
  const prevUserRef = useRef(null);
  useEffect(() => {
    if (!prevUserRef.current && user) {
      const dest = localStorage.getItem('post_auth_redirect');
      const ts = Number(localStorage.getItem('post_auth_redirect_ts') || 0);
      localStorage.removeItem('post_auth_redirect');
      localStorage.removeItem('post_auth_redirect_ts');
      if (dest && Date.now() - ts < 15 * 60 * 1000) navigate(dest);
    }
    prevUserRef.current = user;
  }, [user]);

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
      navigate('/go-live');
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
      return <AdminLayout><Suspense fallback={<RouteFallback />}>{children}</Suspense></AdminLayout>;
  };

  return (
    <WagerProvider>
    <ThemeProvider defaultTheme="dark" storageKey="homies-hub-theme">
        <Helmet>
            <title>The Homies Hub</title>
            <meta name="description" content="A social community for men sharing their experiences." />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        </Helmet>

        <RouteTracker />
        <ChatHostRedirect />
        <EmailVerifyGate />

        {/* Outer boundary for the standalone (non-layout) routes; layouts have their own so their chrome stays up while a page loads. */}
        <Suspense fallback={<RouteFallback full dark={location.pathname.startsWith('/chat')} />}>
        <BannedScreen />
        <MembershipGate full>
        <Routes>
            {/* --- Media Mode Routes --- */}
            <Route path="/media" element={<MediaLayout />}>
                <Route index element={<MediaApp />} />
                {/* Per-tab URLs so a refresh stays on the same tab (music/videos/etc). */}
                <Route path="home" element={<MediaApp />} />
                <Route path="videos" element={<MediaApp />} />
                <Route path="music" element={<MediaApp />} />
                <Route path="likes" element={<MediaApp />} />
                <Route path="purchased" element={<MediaApp />} />
                <Route path="admin" element={<MediaApp />} />
                <Route path=":postId" element={<MediaApp />} />
            </Route>

            {/* --- Dedicated per-song pages (share links land here) --- */}
            <Route element={<MediaLayout />}>
                <Route path="/song/:id" element={<SongPage />} />
                <Route path="/track/:id" element={<SongPage />} />
            </Route>
            
            {/* --- My AI Route (Guarded) CHANGED to /AI --- */}
            <Route path="/AI" element={
                <FeatureGuard feature="my_ai">
                    <MyAIPage />
                </FeatureGuard>
            } />

            {/* --- My Apps (ecosystem hub) --- */}
            <Route path="/my-apps" element={<MyAppsPage />} />

            {/* --- Fundraiser (public, standalone full-bleed) --- */}
            <Route path="/fundy" element={<FundyPage />} />

            {/* --- Homies Chat (Discord-style community chat, full-screen) ---
                 /discord and /community are friendly aliases. */}
            <Route path="/chat/:channelId?" element={<LocationGate><Suspense fallback={<RouteFallback full dark />}><ChatPage onLoginRequest={() => setAuthModalState({ isOpen: true, view: 'main' })} /></Suspense></LocationGate>} />
            <Route path="/discord/*" element={<Navigate to="/chat" replace />} />
            <Route path="/community/*" element={<Navigate to="/chat" replace />} />

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

            {/* Creator Studio hidden 2026-07-30 (George) -- fake Monetization tab (localStorage-only,
                no backend) + unresolved marketplace seller-payout gap found in audit. Route redirects
                home instead of 404ing so old bookmarks/links don't break oddly. Reserved for when
                it's actually fixed -- don't re-enable without addressing those two issues first. */}
            <Route path="/studio" element={<Navigate to="/" />} />
            {/* Live streaming paused 2026-08-15 (George) -- music is the priority right now,
                broadcasting stays gated behind a Coming Soon notice until it's reworked.
                GoLivePage itself is untouched, just not routed to. */}
            <Route path="/studio/stream" element={user ? <LiveComingSoon /> : <Navigate to="/" />} />
            <Route path="/go-live" element={
                user ? <LiveComingSoon /> : <Navigate to="/" />
            } />

            {/* Standalone payment page for the mobile app's in-app browser sheet
                (see src/pages/PayPage.jsx) -- deliberately NOT gated on `user`,
                since it authenticates via a ?token= query param instead of the
                web app's own session, and mobile opens this in a fresh browser
                context with no session of its own yet. */}
            <Route path="/pay" element={<PayPage />} />

            {/* --- Admin Routes --- */}
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            <Route path="/join" element={<JoinGatePage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminRouteWrapper><AdminDashboard /></AdminRouteWrapper>} />
            <Route path="/admin/content" element={<AdminRouteWrapper><AdminContent /></AdminRouteWrapper>} />
            <Route path="/admin/users" element={<AdminRouteWrapper><AdminUsers /></AdminRouteWrapper>} />
            <Route path="/admin/visitors" element={<AdminRouteWrapper><AdminVisitors /></AdminRouteWrapper>} />
            <Route path="/admin/analytics" element={user?.isAdmin ? <AdminRouteWrapper><AdminAnalytics /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/engagement" element={user?.isAdmin ? <AdminRouteWrapper><AdminEngagement /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/revenue" element={user?.isAdmin ? <AdminRouteWrapper><AdminRevenue /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/monetization" element={user?.isAdmin ? <AdminRouteWrapper><AdminMonetization /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/payouts" element={user?.isAdmin ? <AdminRouteWrapper><AdminPayouts /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/features" element={user?.isAdmin ? <AdminRouteWrapper><AdminFeatures /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/invite" element={<AdminRouteWrapper><AdminInvite /></AdminRouteWrapper>} />
            <Route path="/admin/media" element={user?.isAdmin ? <AdminRouteWrapper><AdminMediaManager /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/music" element={user?.isAdmin ? <AdminRouteWrapper><AdminMusicManager /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/push" element={user?.isAdmin ? <AdminRouteWrapper><AdminPushNotifications /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/banners" element={user?.isAdmin ? <AdminRouteWrapper><AdminBanners /></AdminRouteWrapper> : <Navigate to="/admin/dashboard" />} />
            <Route path="/admin/moderation" element={<AdminRouteWrapper><AdminModeration /></AdminRouteWrapper>} />

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
                <Route path="/" element={<LandingPage onLoginRequest={handleLoginRequest} />} />
                <Route path="/browse" element={<HomePage onLoginRequest={handleLoginRequest} isImmersiveMode={isImmersiveMode} toggleImmersiveMode={() => setIsImmersiveMode(!isImmersiveMode)} />} />
                <Route path="/memberships" element={<MembershipsPage />} />
                <Route path="/consultation" element={<ConsultationPage />} />
                <Route path="/billing" element={user ? <BillingPage /> : <Navigate to="/?openAuth=1&tab=signin" />} />
                <Route path="/marketplace" element={<MarketplacePage />} />
                <Route path="/purchases" element={user ? <PurchasesPage /> : <Navigate to="/" />} />
                <Route path="/clips" element={user ? <MyClipsPage /> : <Navigate to="/" />} />
                <Route path="/clips/:id" element={user ? <MyClipsPage /> : <Navigate to="/" />} />
                
                <Route path="/explore" element={
                    <FeatureGuard feature="explore">
                        <ExplorePage onLoginRequest={handleLoginRequest} />
                    </FeatureGuard>
                } />
                
                <Route path="/live" element={<LiveComingSoon />} />

                <Route path="/live-stream/:username" element={<LiveComingSoon />} />

                <Route path="/vod/:streamId" element={<LiveComingSoon />} />

                <Route path="/library" element={
                    <FeatureGuard feature="library">
                        <LibraryPage onUpgradeRequest={handleUpgradeRequest} onLoginRequest={handleLoginRequest} onPostClick={handleOpenPostModal} />
                    </FeatureGuard>
                } />
                
                <Route path="/communities" element={<Navigate to="/browse" replace />} />
                <Route path="/wagers" element={<Navigate to="/browse" replace />} />
                <Route path="/wagers/:id" element={<Navigate to="/browse" replace />} />
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
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
                <Route path="/child-safety" element={<ChildSafetyPage />} />
                <Route path="/support" element={<SupportPage />} />

                <Route path="/creator-studio" element={user ? <CreatorStudioPage onLoginRequest={handleLoginRequest} /> : <Navigate to="/" />} />
                <Route path="/trips" element={<TripsPage onLoginRequest={handleLoginRequest} />} />
                <Route path="/experiences" element={<Navigate to="/trips" replace />} />

                {/* Single-segment invite links (thehomies.app/<code>, created via Telegram
                    /invite) — React Router ranks every static route above this dynamic one,
                    so it only ever matches a path nothing else claims. InvitePage itself
                    validates the code against the backend and bounces home if it's fake. */}
                <Route path="/:inviteCode" element={<InvitePage />} />

                {/* Catch-all: unknown multi-segment paths redirect home instead of white-screening. */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
        </MembershipGate>
        </Suspense>

        <AuthModal
            isOpen={authModalState.isOpen}
            onOpenChange={(isOpen) => setAuthModalState(prev => ({ ...prev, isOpen }))}
            initialView={authModalState.view}
            initialTab={authModalState.tab || 'signin'}
        />
        
        {/* Guard Post Modal creation */}
        <FeatureGuard feature="create_post" fallback={null}>
            <PostModal isOpen={isPostModalOpen} onOpenChange={setPostModalOpen} initialPostType={postModalType} />
        </FeatureGuard>

        <FeatureLockedModal 
            isOpen={isLockedModalOpen} 
            onOpenChange={setIsLockedModalOpen}
        />
        <OnboardingFlow isOpen={showOnboarding} onClose={stopTutorial} />
        <DiscordConnectPrompt open={showDiscordPrompt && !showOnboarding && !location.pathname.startsWith('/chat')} onDismiss={dismissDiscordPrompt} />
        {showJoinInvite && <JoinInviteModal onClose={() => setShowJoinInvite(false)} />}
        <PlaceView />
        {/* The chat composer owns the bottom-right corner on /chat. */}
        {!location.pathname.startsWith('/chat') && <HelpAssistant />}
        <Toaster />

        {/* Story viewer — fixed fullscreen, independent of all layout/feed lifecycle */}
        {viewingIndex !== null && (
          <Suspense fallback={null}>
            <StoryViewer
              stories={orderedStories}
              initialStoryIndex={viewingIndex}
              onClose={closeStory}
            />
          </Suspense>
        )}
    </ThemeProvider>
    </WagerProvider>
  );
});

function App() {
  return <AppContent />;
}

export default App;
