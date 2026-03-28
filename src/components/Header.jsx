
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
