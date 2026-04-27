import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useContent } from '@/contexts/ContentContext';

// Pinned promo story — always first, visible to everyone
export const HOMIES_PROMO_STORY = {
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

const EXCLUDED_USERNAMES = new Set(['alexnomad', 'alex_nomad', 'alex nomad']);

const StoryContext = createContext(null);

export const StoryProvider = ({ children }) => {
  const { user } = useAuth();
  const { stories } = useContent();
  const [viewingIndex, setViewingIndex] = useState(null);

  const filteredStories = useMemo(() => {
    return (stories || []).filter(
      s => !EXCLUDED_USERNAMES.has((s.username || '').toLowerCase())
    );
  }, [stories]);

  const orderedStories = useMemo(() => {
    const base = [HOMIES_PROMO_STORY];
    if (!user) return [...base, ...filteredStories];
    const myStory = filteredStories.find(s => s.username === user.username);
    const others = filteredStories.filter(s => s.username !== user.username);
    return myStory ? [...base, myStory, ...others] : [...base, ...others];
  }, [filteredStories, user]);

  const openStory = (userId) => {
    const index = orderedStories.findIndex(s => s.userId === userId);
    if (index !== -1) setViewingIndex(index);
  };

  const closeStory = () => setViewingIndex(null);

  return (
    <StoryContext.Provider value={{ orderedStories, filteredStories, viewingIndex, openStory, closeStory }}>
      {children}
    </StoryContext.Provider>
  );
};

export const useStory = () => useContext(StoryContext);
