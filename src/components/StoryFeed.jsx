import React, { useState, useMemo } from 'react';
import { Plus, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useContent } from '@/contexts/ContentContext';
import { cn } from '@/lib/utils';
import StoryViewer from '@/components/StoryViewer';
import UploadStoryModal from '@/components/UploadStoryModal';

// Pinned promo story — always first, visible to everyone
const HOMIES_PROMO_STORY = {
  userId: '__homies_promo__',
  username: 'The Homies',
  avatar: '/logo.png',
  isPromo: true,
  items: [
    {
      id: 'promo-memberships',
      type: 'promo',
      viewed: false,
      timestamp: 'now',
      promo: {
        badge: 'Memberships',
        badgeColor: 'bg-yellow-500',
        title: 'Join The Homies',
        lines: [
          { label: '$15 / mo', desc: 'Homies Tier — full community access, Discord, exclusive content' },
          { label: '$100 / mo', desc: 'Digital Nomad Mentorship — 1-on-1 coaching, income systems, life abroad' },
        ],
        cta: 'See Plans',
        ctaUrl: '/memberships',
        ctaExternal: false,
        bg: 'from-yellow-900/80 to-zinc-900',
      },
    },
    {
      id: 'promo-consult-30',
      type: 'promo',
      viewed: false,
      timestamp: 'now',
      promo: {
        badge: '30-Min Consult',
        badgeColor: 'bg-blue-500',
        title: 'Travel Tips 1-on-1',
        lines: [
          { label: 'Colombia · Peru · Thailand', desc: '' },
          { label: 'London · Amsterdam & more', desc: '' },
          { label: '', desc: 'Get personalised travel advice from someone who has actually lived there.' },
        ],
        cta: 'Book Now',
        ctaUrl: 'https://buy.stripe.com/5kQfZgbadeo24Rvgdkf7i0f',
        ctaExternal: true,
        bg: 'from-blue-900/80 to-zinc-900',
      },
    },
    {
      id: 'promo-consult-60',
      type: 'promo',
      viewed: false,
      timestamp: 'now',
      promo: {
        badge: '1-Hour Deep Dive',
        badgeColor: 'bg-orange-500',
        title: 'Digital Nomad & Business',
        lines: [
          { label: 'Living abroad', desc: 'How to actually make the move.' },
          { label: 'Earning with AI', desc: 'Build income streams that travel with you.' },
          { label: 'Start your business', desc: 'From idea to revenue, step by step.' },
        ],
        cta: 'Book Now',
        ctaUrl: 'https://buy.stripe.com/aFa5kCemp3Jo3Nr4uCf7i0g',
        ctaExternal: true,
        bg: 'from-orange-900/80 to-zinc-900',
      },
    },
  ],
};

// Usernames to exclude from stories (e.g. spam or replaced accounts)
const EXCLUDED_USERNAMES = new Set(['alexnomad', 'alex_nomad', 'alex nomad']);

const StoryFeed = () => {
  const { user } = useAuth();
  const { stories } = useContent();
  const [viewingStoryIndex, setViewingStoryIndex] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const filteredStories = useMemo(() => {
    return (stories || []).filter(s => !EXCLUDED_USERNAMES.has((s.username || '').toLowerCase()));
  }, [stories]);

  const orderedStories = useMemo(() => {
    // Always pinned first: The Homies promo
    const base = [HOMIES_PROMO_STORY];

    if (!user) return [...base, ...filteredStories];

    const myStory = filteredStories.find(s => s.username === user.username);
    const otherStories = filteredStories.filter(s => s.username !== user.username);

    return myStory ? [...base, myStory, ...otherStories] : [...base, ...otherStories];
  }, [filteredStories, user]);

  const handleStoryClick = (story) => {
    const index = orderedStories.findIndex(s => s.userId === story.userId);
    if (index !== -1) setViewingStoryIndex(index);
  };

  const handleMyStoryClick = () => {
    const myStory = filteredStories.find(s => s.username === user?.username);
    if (myStory && myStory.items.length > 0) {
      handleStoryClick(myStory);
    } else {
      setIsUploadModalOpen(true);
    }
  };

  const myStory = user ? filteredStories.find(s => s.username === user.username) : null;
  const otherStories = user
    ? filteredStories.filter(s => s.username !== user.username)
    : filteredStories;

  return (
    <>
      <div className="w-full flex gap-4 overflow-x-auto px-4 py-3 no-scrollbar border-b border-white/10 bg-black/40 backdrop-blur-md z-40 relative select-none">

        {/* The Homies pinned promo — always first */}
        <div
          className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer"
          onClick={() => handleStoryClick(HOMIES_PROMO_STORY)}
        >
          <div className="p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500">
            <div className="h-16 w-16 rounded-full border-2 border-black bg-zinc-900 flex items-center justify-center overflow-hidden">
              <Crown className="h-7 w-7 text-yellow-400" />
            </div>
          </div>
          <span className="text-xs text-white/90 truncate max-w-[72px] text-center font-semibold">The Homies</span>
        </div>

        {/* Your Story */}
        {user && (
          <div className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer" onClick={handleMyStoryClick}>
            <div className="relative">
              <div className={cn(
                "p-[3px] rounded-full",
                myStory ? "bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500" : "bg-transparent border border-white/20"
              )}>
                <Avatar className="h-16 w-16 border-2 border-black">
                  <AvatarImage src={user?.avatar} alt="Your Story" />
                  <AvatarFallback>Me</AvatarFallback>
                </Avatar>
              </div>
              {!myStory && (
                <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-black">
                  <Plus className="h-3 w-3 text-white" strokeWidth={4} />
                </div>
              )}
            </div>
            <span className="text-xs text-white/90 truncate max-w-[72px]">Your Story</span>
          </div>
        )}

        {/* Other Stories */}
        {otherStories.map((story) => {
          const allViewed = story.items.every(i => i.viewed);
          return (
            <div
              key={story.username}
              className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer group"
              onClick={() => handleStoryClick(story)}
            >
              <div className={cn(
                "p-[3px] rounded-full transition-transform duration-200 group-hover:scale-105",
                allViewed
                  ? "bg-zinc-600"
                  : "bg-gradient-to-tr from-yellow-400 via-orange-500 to-red-500"
              )}>
                <Avatar className="h-16 w-16 border-2 border-black">
                  <AvatarImage src={story.avatar} alt={story.username} />
                  <AvatarFallback>{story.username[0]}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-white/90 truncate max-w-[72px]">{story.username}</span>
            </div>
          );
        })}
      </div>

      {viewingStoryIndex !== null && (
        <StoryViewer
          stories={orderedStories}
          initialStoryIndex={viewingStoryIndex}
          onClose={() => setViewingStoryIndex(null)}
        />
      )}

      <UploadStoryModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
      />
    </>
  );
};

export default StoryFeed;
