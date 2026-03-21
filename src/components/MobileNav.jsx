
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Compass, Plus, Play, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useMedia } from '@/contexts/MediaContext';
import { useFeatures } from '@/contexts/FeatureContext';

const MobileNavItem = ({ to, icon: Icon, label, onClick, featureKey, isActiveOverride }) => {
    const location = useLocation();
    const { checkAccess } = useFeatures();
    const isActive = isActiveOverride !== undefined ? isActiveOverride : (location.pathname === to || (to === '/media' && location.pathname.startsWith('/media')));

    if (featureKey) {
        const { status } = checkAccess(featureKey);
        if (status === 'hidden') return null;
    }

    const Component = to ? NavLink : 'button';

    return (
        <Component
            to={to}
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-0.5",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
        >
            <Icon className={cn("h-6 w-6", isActive && "fill-current/20")} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
        </Component>
    )
}

const MobileNav = ({ onPostClick, onLoginRequest, onMenuClick }) => {
    const { user } = useAuth();
    const { checkAccess } = useFeatures();
    const { hasEnteredMediaMode, isPlaying, currentTrack } = useMedia();
    const isMediaActive = hasEnteredMediaMode && !!currentTrack;

    const createPostAccess = checkAccess('create_post');

    const handleCreateClick = (e) => {
        e.preventDefault();
        onPostClick();
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around z-50 px-2 pb-safe shadow-lg">
            <MobileNavItem to="/" icon={Home} label="Home" />

            <MobileNavItem to="/explore" icon={Compass} label="Explore" featureKey="explore" />

            <div className="flex items-center justify-center -mt-6">
                {createPostAccess.status !== 'hidden' && (
                    <Button
                        onClick={handleCreateClick}
                        size="icon"
                        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow-gold border-4 border-background"
                        disabled={createPostAccess.status === 'blurred'}
                    >
                        <Plus className="h-7 w-7" />
                    </Button>
                )}
            </div>

            {/* Media icon — pulses with glow when minimized and playing */}
            <NavLink
                to="/media"
                className={cn(
                    "flex flex-col items-center justify-center w-full h-full space-y-0.5 relative",
                    isMediaActive ? "text-red-500" : "text-muted-foreground hover:text-foreground"
                )}
            >
                {/* Pulsing glow ring when media is minimized and active */}
                {isMediaActive && (
                    <motion.span
                        className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-red-500/30"
                        animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )}
                <motion.div
                    animate={isMediaActive && isPlaying ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                    transition={{ duration: 0.8, repeat: isMediaActive && isPlaying ? Infinity : 0, ease: 'easeInOut' }}
                >
                    <Play
                        className={cn("h-6 w-6 relative z-10", isMediaActive && "fill-current")}
                        strokeWidth={isMediaActive ? 2.5 : 2}
                    />
                </motion.div>
                <span className="text-[10px] font-medium relative z-10">Media</span>
            </NavLink>

            <MobileNavItem
                to={null}
                icon={Menu}
                label="Menu"
                onClick={onMenuClick}
                isActiveOverride={false}
            />
        </nav>
    );
};

export default MobileNav;
