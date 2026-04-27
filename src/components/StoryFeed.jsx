import React, { useState } from 'react';
import { Plus, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useStory } from '@/contexts/StoryContext';
import { cn } from '@/lib/utils';
import UploadStoryModal from '@/components/UploadStoryModal';

const StoryFeed = () => {
  const { user } = useAuth();
  const { orderedStories, filteredStories, openStory } = useStory();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const myStory = user ? filteredStories.find(s => s.username === user.username) : null;
  const otherStories = user
    ? filteredStories.filter(s => s.username !== user.username)
    : filteredStories;

  const handleMyStoryClick = () => {
    if (myStory && myStory.items.length > 0) {
      openStory(myStory.userId);
    } else {
      setIsUploadModalOpen(true);
    }
  };

  return (
    <>
      <div className="w-full flex gap-4 overflow-x-auto px-4 py-3 no-scrollbar border-b border-white/10 bg-black/40 backdrop-blur-md z-40 relative select-none">

        {/* The Homies pinned promo — always first */}
        <div
          className="flex flex-col items-center gap-1 min-w-[72px] cursor-pointer"
          onClick={() => openStory('__homies_promo__')}
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
              onClick={() => openStory(story.userId)}
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

      <UploadStoryModal
        isOpen={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
      />
    </>
  );
};

export default StoryFeed;
