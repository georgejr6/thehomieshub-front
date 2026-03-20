import React, { useState, useEffect } from 'react';
import { useMedia } from '@/contexts/MediaContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Search, X, Minimize2, ListMusic, Maximize, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManagePlaylistsModal } from './PlaylistModals';
import MediaRow from './MediaRow';
import { cn } from '@/lib/utils';

const MediaApp = () => {
  const {
    minimizeMediaMode,
    exitMediaMode,
    allTracks,
    genreRows,
    catalogLoading,
    newReleases,
    popularVideos,
    likedMedia,
    activeCategory,
    setActiveCategory,
    playMedia,
  } = useMedia();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isPlaylistManagerOpen, setIsPlaylistManagerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.getElementById('media-scroller')?.scrollTop || 0;
      setIsScrolled(scrollTop > 50);
    };
    
    const scroller = document.getElementById('media-scroller');
    if (scroller) scroller.addEventListener('scroll', handleScroll);
    return () => scroller?.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleBrowserFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(e => console.error(e));
      } else {
          if (document.exitFullscreen) document.exitFullscreen(); 
      }
  };

  const featuredItem = allTracks.length > 0 ? allTracks[0] : null;
  const hasContent = !!featuredItem && !catalogLoading;

  const searchResults = searchQuery
    ? allTracks.filter(t =>
        t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.artist?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="fixed inset-0 z-[100] bg-[#141414] text-white font-sans overflow-hidden flex flex-col">

      {/* Navigation Bar */}
      <nav className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 px-4 md:px-12 h-16 flex items-center justify-between",
          isScrolled ? "bg-black/95 shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent"
      )}>
          <div className="flex items-center gap-8">
              <div className="text-red-600 font-black text-2xl tracking-tighter cursor-pointer select-none" onClick={() => setActiveCategory('home')}>DIGITVL</div>
              <ul className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
                  {['Home', 'Videos', 'Music', 'Likes'].map((cat) => (
                       <li 
                            key={cat}
                            className={cn("hover:text-white cursor-pointer transition-colors", activeCategory === cat.toLowerCase() && "text-white font-bold")} 
                            onClick={() => setActiveCategory(cat.toLowerCase())}
                       >
                           {cat}
                       </li>
                  ))}
              </ul>
          </div>

          <div className="flex items-center gap-4 text-white">
              <div className={cn("flex items-center transition-all duration-300 overflow-hidden bg-black/50 border border-transparent rounded-full", isSearchOpen ? "w-48 md:w-64 border-zinc-700 px-3 py-1" : "w-8 bg-transparent")}>
                  <button onClick={() => { setIsSearchOpen(!isSearchOpen); if(!isSearchOpen) setTimeout(() => document.getElementById('media-search')?.focus(), 100); }} className="hover:text-zinc-300 shrink-0">
                      <Search className="h-5 w-5" />
                  </button>
                  <input 
                    id="media-search"
                    type="text" 
                    placeholder="Titles, people, genres" 
                    className={cn("bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-white placeholder:text-zinc-400 outline-none", !isSearchOpen && "hidden")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && isSearchOpen && (
                      <button onClick={() => setSearchQuery('')} className="hover:text-white text-zinc-400"><X className="h-4 w-4" /></button>
                  )}
              </div>
              
              <button onClick={() => setIsPlaylistManagerOpen(true)} className="flex items-center gap-2 hover:text-white text-zinc-300"><ListMusic className="h-5 w-5" /></button>
              <button onClick={toggleBrowserFullscreen} className="hover:text-white text-zinc-300"><Maximize className="h-5 w-5" /></button>
              <button onClick={minimizeMediaMode} className="hover:text-red-500 text-white ml-2"><Minimize2 className="h-5 w-5" /></button>
              <button onClick={exitMediaMode} className="hover:text-red-500 text-white"><X className="h-5 w-5" /></button>
          </div>
      </nav>

      {/* Scrollable Container */}
      <div id="media-scroller" className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
          
          {/* SEARCH VIEW */}
          {searchQuery ? (
              <div className="pt-24 px-4 md:px-12 min-h-screen">
                  <h2 className="text-xl text-zinc-400 mb-6">Results for "{searchQuery}"</h2>
                  {searchResults.length > 0 ? (
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                           {searchResults.map(item => (
                               <div key={item.id} className="cursor-pointer group relative" onClick={() => playMedia(item)}>
                                   <div className="aspect-video relative rounded-md overflow-hidden bg-zinc-800 mb-2">
                                       <img src={item.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e) => e.target.src="https://images.unsplash.com/photo-1516280440614-6697288d5d38"} />
                                   </div>
                                   <h3 className="font-bold text-sm truncate">{item.title}</h3>
                               </div>
                           ))}
                       </div>
                  ) : ( <p className="text-zinc-500">No matches found.</p> )}
              </div>
          ) : activeCategory === 'likes' ? (
              <div className="pt-24 px-4 md:px-12 min-h-screen">
                  <h1 className="text-3xl font-bold mb-8">My List</h1>
                  <MediaRow title="Liked Videos" items={likedMedia} />
              </div>
          ) : (
            <>
                {/* HERO SECTION */}
                {hasContent ? (
                    <div className="relative w-full h-[56.25vw] max-h-[85vh] min-h-[400px]">
                        {/* Background — album art with blur */}
                        <div className="absolute inset-0 select-none">
                            <img src={featuredItem.cover} className="w-full h-full object-cover scale-110 blur-sm opacity-60" alt="Hero bg"
                              onError={e => { e.target.src = `https://picsum.photos/seed/${featuredItem.id}/1200/630`; }} />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/90 via-[#141414]/50 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent" />
                        </div>

                        {/* Hero Info Content */}
                        <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center px-4 md:px-12 pb-12">
                            <div className="max-w-2xl space-y-4 pt-16">
                                <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-left-4 duration-700">
                                    <div className="h-8 w-1 bg-red-600 rounded-full" />
                                    <span className="text-white/90 tracking-[0.2em] font-bold text-sm uppercase">Featured Premiere</span>
                                </div>
                                
                                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[0.9] drop-shadow-2xl animate-in fade-in zoom-in-95 duration-700 delay-100 max-w-full line-clamp-2">
                                    {featuredItem.title}
                                </h1>
                                
                                <div className="flex items-center gap-3 text-white text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                                    <span className="text-green-400">98% Match</span>
                                    <span>{featuredItem.duration}</span>
                                    <span className="border border-white/40 px-1.5 py-0.5 rounded text-xs bg-black/20 backdrop-blur-sm">HD</span>
                                </div>

                                <p className="text-base md:text-lg text-white/90 drop-shadow-md line-clamp-3 max-w-xl font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                                    Experience the visual journey of {featuredItem.artist}. A cinematic masterpiece available exclusively on DIGITVL.
                                </p>

                                <div className="flex items-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                                    <Button
                                        size="lg"
                                        className="bg-white text-black hover:bg-white/90 font-bold px-8 h-12 text-lg gap-2 rounded-md transition-transform hover:scale-105"
                                        onClick={() => playMedia(featuredItem)}
                                    >
                                        <Play className="fill-black h-6 w-6" /> Play
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-[70vh] w-full flex flex-col items-center justify-center bg-zinc-900">
                        <Loader2 className="h-10 w-10 animate-spin text-red-600 mb-4" />
                        <p className="text-zinc-500">Initializing Studio...</p>
                    </div>
                )}

                {/* CONTENT ROWS */}
                <div className="relative z-10 -mt-24 md:-mt-32 pb-36 space-y-8 pl-4 md:pl-12 bg-transparent">
                    {allTracks.length > 0 && (
                        <MediaRow title="All Tracks" items={allTracks} />
                    )}
                    {allTracks.length >= 5 && (
                        <MediaRow title="Top 10" items={allTracks.slice(0, 10)} isRanked />
                    )}
                    {genreRows.map(({ genre, items }) => (
                        <MediaRow key={genre} title={genre} items={items} />
                    ))}
                    {likedMedia.length > 0 && (
                        <MediaRow title="Liked Tracks" items={likedMedia} />
                    )}
                </div>
            </>
          )}

          {/* Footer */}
          <div className="px-12 py-20 text-zinc-500 text-sm bg-[#141414]">
             <div className="max-w-4xl mx-auto text-center space-y-4">
                 <div className="flex justify-center gap-6 mb-4">
                     <span className="hover:text-white cursor-pointer">Terms of Use</span>
                     <span className="hover:text-white cursor-pointer">Privacy Policy</span>
                     <span className="hover:text-white cursor-pointer">Help Center</span>
                 </div>
                 <p>&copy; 2025 DIGITVL, Inc.</p>
             </div>
          </div>
      </div>

      <ManagePlaylistsModal isOpen={isPlaylistManagerOpen} onClose={() => setIsPlaylistManagerOpen(false)} />
    </div>
  );
};

export default MediaApp;