
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Bell, Menu, User, LogIn, Wallet, DollarSign, Sparkles, Settings, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import NotificationsPopover from '@/components/NotificationsPopover';
import BackButton from '@/components/BackButton';
import { cn } from '@/lib/utils';
import cashappIcon from '@/assets/cashapp.svg';
import stripeIcon from '@/assets/stripe.svg';

const BetaPopover = () => <Popover>
        <PopoverTrigger asChild>
            <motion.div whileHover={{
      scale: 1.1,
      rotate: -5
    }} className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-md cursor-pointer select-none">
                BETA
            </motion.div>
        </PopoverTrigger>
        <PopoverContent className="w-80">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none text-primary">Welcome to the Beta!</h4>
                    <p className="text-sm text-muted-foreground">
                        Features are being tested and implemented over time. Your support helps us build faster!
                    </p>
                </div>
                <div className="grid gap-2">
                     <p className="text-sm font-medium">Support the project:</p>
                    <a href="https://cash.app/$Homieshub" target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <img src={cashappIcon} alt="Cash App" className="h-4 w-4 mr-2" />
                        Donate with Cash App ($Homieshub)
                      </Button>
                    </a>
                    <a href="https://donate.stripe.com/fZu9ASbadcfU5VzbX4" target="_blank" rel="noopener noreferrer" className="block">
                       <Button variant="outline" className="w-full justify-start">
                        <img src={stripeIcon} alt="Stripe" className="h-4 w-4 mr-2" />
                        Donate with Stripe
                      </Button>
                    </a>
                </div>
            </div>
        </PopoverContent>
    </Popover>;
const DonateDialog = () => <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size="icon">
          <DollarSign className="h-5 w-5" />
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle className="text-primary text-center">Support The Homies Hub</DialogTitle>
            <DialogDescription className="text-center">
                Your contributions help us build and improve the community. Choose your preferred way to donate.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
           <a href="https://cash.app/$Homieshub" target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full justify-start text-lg p-6">
                <img src={cashappIcon} alt="Cash App" className="h-6 w-6 mr-4" />
                Donate via Cash App
              </Button>
            </a>
            <a href="https://donate.stripe.com/fZu9ASbadcfU5VzbX4" target="_blank" rel="noopener noreferrer" className="block">
               <Button variant="outline" className="w-full justify-start text-lg p-6">
                <img src={stripeIcon} alt="Stripe" className="h-6 w-6 mr-4" />
                Donate via Stripe
              </Button>
            </a>
        </div>
    </DialogContent>
  </Dialog>;

const DiscordIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.134 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const YouTubeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const Header = ({
  onLoginClick,
  onMenuClick,
  onLoginRequest,
  isMobile
}) => {
  const {
    user,
    signOut,
    setIsLockedModalOpen,
    startTutorial,
  } = useAuth();
  const { checkAccess } = useFeatures();
  const navigate = useNavigate();
  const location = useLocation();
  
  const walletAccess = checkAccess('wallet');
  const searchAccess = checkAccess('search');

  const handleSearch = event => {
    event.preventDefault();
    if (searchAccess.status !== 'active') return;
    const query = event.target.elements.search.value;
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  const handleWalletClick = () => {
    if (!user) {
      onLoginRequest();
      return;
    }
    navigate('/wallet');
  };
  const handleUpgradeToPremium = () => {
    // Instead of redirecting, we open the FeatureLockedModal
    setIsLockedModalOpen(true);
  };

  const showBackButton = location.pathname !== '/' && location.pathname !== '/home';

  return <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-background/95 backdrop-blur-md border-b border-b-primary/10 pt-safe">
      <div className="flex items-center gap-2 md:gap-4 flex-shrink min-w-0">
        {showBackButton ? (
             <BackButton className="mr-0" />
        ) : (
            !isMobile && <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
                <Menu className="h-6 w-6" />
            </Button>
        )}
        
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <motion.h1 
            className="text-lg md:text-xl font-bold tracking-tighter text-primary truncate" 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            transition={{ duration: 0.5 }}
          >
            The Homies
          </motion.h1>
          <div className="hidden xs:block">
             <BetaPopover />
          </div>
        </Link>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-auto items-center">
        {searchAccess.status !== 'hidden' && (
            <form onSubmit={handleSearch} className="w-full relative">
            <Input 
                name="search" 
                type="search" 
                placeholder="Search for anything..." 
                className="pl-10 rounded-full" 
                disabled={searchAccess.status === 'blurred'}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            </form>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
        {/* Discord + YouTube — desktop only */}
        <div className="hidden md:flex items-center gap-1">
          <a href="https://discord.gg/cxz8FQnbGf" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="text-[#5865F2] hover:text-[#5865F2] hover:bg-[#5865F2]/10" title="Join our Discord">
              <DiscordIcon className="h-5 w-5" />
            </Button>
          </a>
          <a href="https://www.youtube.com/@TheHomiesHub_" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="text-[#FF0000] hover:text-[#FF0000] hover:bg-[#FF0000]/10" title="YouTube Channel">
              <YouTubeIcon className="h-5 w-5" />
            </Button>
          </a>
          <a href="https://donate.stripe.com/fZu9ASbadcfU5VzbX4" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="text-[#22c55e] hover:text-[#22c55e] hover:bg-[#22c55e]/10" title="Donate">
              <DollarSign className="h-5 w-5" />
            </Button>
          </a>
        </div>

        {/* Mobile Search Icon */}
        {isMobile && searchAccess.status !== 'hidden' && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/search')} disabled={searchAccess.status === 'blurred'}>
                <Search className="h-5 w-5" />
            </Button>
        )}

        {user ? <>
            <div className="hidden md:block">
                <DonateDialog />
            </div>

            {/* Wallet button visible on mobile now */}
            {walletAccess.status !== 'hidden' && (
                <Button variant="ghost" size="icon" onClick={handleWalletClick} disabled={walletAccess.status === 'blurred'}>
                    <Wallet className="h-5 w-5" />
                </Button>
            )}
            
            <NotificationsPopover />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                   <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>{(user?.name || "U").charAt(0)}</AvatarFallback>
                    </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">@{user.username}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/profile/${user.username}`)}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                {user.tier === 'Free' && <DropdownMenuItem onClick={handleUpgradeToPremium} className="text-primary font-medium cursor-pointer bg-primary/5">
                     <Sparkles className="mr-2 h-4 w-4 text-primary" />
                     <span>Upgrade to Premium</span>
                  </DropdownMenuItem>}
                 <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={startTutorial}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span>Tutorial</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogIn className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </> : <>
             {!isMobile && <DonateDialog />}
            <Button onClick={onLoginClick} size={isMobile ? "sm" : "default"}>
              <User className={cn("mr-2 h-4 w-4", isMobile ? "mr-0" : "")} />
              {!isMobile && "Sign In"}
            </Button>
          </>}
      </div>
    </header>;
};
export default Header;
