
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Share2, Play, MapPin, CheckCircle, Loader2, Gift, Ticket, Database, Aperture, ShieldAlert, Lock, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import ShareDialog from '@/components/ShareDialog';
import MoreOptionsDropdown from '@/components/MoreOptionsDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useContent } from '@/contexts/ContentContext';
import CommentsSheet from '@/components/CommentsSheet'; 
import GiftDialog from '@/components/GiftDialog';
import TripView from '@/components/TripView';
import MintedCollectibleModal from '@/components/MintedCollectibleModal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const FeedItem = ({ post, onLoginRequest, compact = false }) => { 
  const { toast } = useToast();
  
  const { user, isPremium, triggerLockedFeature } = useAuth();
  const { users, openPlaceModal, isPostLiked, togglePostLike } = useContent();
  
  // Sync local liked state with global context
  const isGlobalLiked = isPostLiked(post.id);
  const [likeCount, setLikeCount] = useState(post?.engagement?.likes ?? 0);
  
  const [selectedPollOption, setSelectedPollOption] = useState(null);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isGiftDialogOpen, setIsGiftDialogOpen] = useState(false);
  const [isGoing, setIsGoing] = useState(false);
  const [isTripViewOpen, setIsTripViewOpen] = useState(false);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  
  // Blur Logic
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const isSubscriberLocked = post.isSubscriberOnly && !isPremium;
  const isNSFWLocked = post.isNSFW && !isUnlocked;
  
  const isBlurred = (post.isSubscriberOnly && !isPremium) || (post.isNSFW && !isUnlocked);

  const isOwnProfile = user && user.username === post.user.username;
  const postUrl = `${window.location.origin}/post/${post.id}`;
  const postUser = users[post.user.username];

  // Optimistic UI updates for likes
  useEffect(() => {
      // If global state says liked, ensure we reflect it. 
  }, [isGlobalLiked]);

  useEffect(() => {
  setLikeCount(post?.engagement?.likes ?? 0);
}, [post?.engagement?.likes]);


  if (postUser?.isBanned) return null;

  const handleBlurClick = (e) => {
    e.stopPropagation();
    if (post.isSubscriberOnly && !isPremium) {
        triggerLockedFeature(); // Show paywall
    } else if (post.isNSFW) {
        setIsUnlocked(true); // Unlock locally
    }
  };

  const handleLike = () => {
    if (!user) { onLoginRequest(); return; }
    if (isLikeLoading) return;
    
    setIsLikeLoading(true);
    
    // Toggle Global Context
    togglePostLike(post.id);
    
    // Optimistic Update
    const newLikedState = !isGlobalLiked;
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
    
    setTimeout(() => {
      setIsLikeLoading(false);
      toast({
        title: newLikedState ? '❤️ Liked!' : '💔 Unliked',
        description: newLikedState ? `Added to your Library.` : `Removed from your Library.`,
      });
    }, 400);
  };

  const handleGiftClick = () => {
    if (!user) { onLoginRequest(); return; }
    if (isOwnProfile) {
        toast({
            title: "Cannot Gift Yourself",
            description: "Nice try! You can only send gifts to other creators.",
            variant: "destructive"
        });
        return;
    }
    if (!isPremium) { triggerLockedFeature(); return; }
    setIsGiftDialogOpen(true);
  };
  
  const handleLocationClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if(post.location) openPlaceModal(post.location);
  };

  const handlePollVote = (optionIndex) => {
    setSelectedPollOption(optionIndex);
    toast({ title: "🗳️ Vote Recorded", description: `You voted for "${post.content.poll.options[optionIndex].text}"` });
  };

  const handleRSVP = () => {
      if(!user) return onLoginRequest();
      setIsGoing(!isGoing);
      toast({ title: !isGoing ? "🎉 RSVP Confirmed" : "RSVP Cancelled", description: !isGoing ? "You are going to this event!" : "You removed your RSVP." });
  };

  const renderContent = () => {
    const content = (
        <>
            {/* MINTED MOMENT CONTENT */}
            {post.type === 'mint' && post.mintData && (
                <div 
                    className="mt-3 relative rounded-xl overflow-hidden border border-primary/30 shadow-[0_0_15px_rgba(234,179,8,0.1)] group cursor-pointer"
                    onClick={() => setIsMintModalOpen(true)}
                >
                    {/* Gold verified badge overlay */}
                    <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-20 flex justify-between items-start">
                         <div className="flex items-center gap-2">
                             <Badge className="bg-primary text-black border-primary font-bold hover:bg-primary/90">
                                 <MapPin className="h-3 w-3 mr-1 fill-black" /> VERIFIED LOCATION
                             </Badge>
                         </div>
                    </div>
                    
                    <div className="aspect-video bg-zinc-900 relative">
                        <img src={post.mintData.image} alt={post.mintData.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="secondary" className="bg-black/50 backdrop-blur text-white border border-white/20">View Collectible</Button>
                        </div>
                    </div>

                    <div className="bg-zinc-900 p-3 border-t border-primary/20 flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <div className="flex items-center gap-2">
                             <span className="text-primary">ASA #{post.mintData.asaId}</span>
                             <span>•</span>
                             <span>Edition {post.mintData.edition}/{post.mintData.totalEditions}</span>
                        </div>
                        <div className="text-[10px] opacity-70">{post.mintData.timestamp}</div>
                    </div>
                </div>
            )}

            {/* Standard Posts */}
            {post.type === 'clip' && (
                <div className="relative mt-2 md:mt-3 rounded-lg overflow-hidden border border-border group aspect-video bg-black">
                    <img className="w-full h-full object-cover" alt={post.content?.title || post.title || 'Video'} src={post.thumbnail || "https://images.unsplash.com/photo-1592572130011-855af2d206af"} />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="h-12 w-12 text-white/80" fill="white" />
                    </div>
                </div>
            )}
            
            {post.type === 'thread' && post.content?.images && (
                <div className="mt-2 md:mt-3 grid grid-cols-2 gap-2">
                    {post.content.images.map((img, index) => (
                        <div key={index} className="overflow-hidden rounded-lg">
                            <img className={cn("w-full object-cover", compact ? "h-24" : "h-40")} alt={`Thread ${index}`} src={img} />
                        </div>
                    ))}
                </div>
            )}

            {post.type === 'poll' && post.content?.poll && (
                <div className="space-y-2 md:space-y-3 mt-2 md:mt-3">
                    <h4 className="font-semibold text-foreground text-sm md:text-base">{post.content.poll.question}</h4>
                    <div className="space-y-2">
                    {post.content.poll.options.map((option, index) => (
                        <motion.button key={index} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handlePollVote(index)} className={`w-full p-2 md:p-3 rounded-lg border text-left transition-colors text-xs md:text-sm ${ selectedPollOption === index ? 'bg-primary/10 border-primary' : 'bg-muted/50 border-border hover:bg-muted'}`}>
                        <div className="flex justify-between items-center"><span className="font-medium">{option.text}</span>{selectedPollOption !== null && <span className="text-muted-foreground">{option.percentage}%</span>}</div>
                        {selectedPollOption !== null && <div className="mt-2 w-full bg-muted rounded-full h-1.5 md:h-2"><div className="bg-primary h-1.5 md:h-2 rounded-full transition-all duration-500" style={{ width: `${option.percentage}%` }}/></div>}
                        </motion.button>
                    ))}
                    </div>
                    <div className="text-xs text-muted-foreground">{post.content.poll.totalVotes} votes • Ends in {post.content.poll.endsIn}</div>
                </div>
            )}

            {post.type === 'trip' && post.content?.trip && (
                <>
                <div className="mt-3 md:mt-4 relative rounded-xl overflow-hidden cursor-pointer group shadow-lg" onClick={() => setIsTripViewOpen(true)}>
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors z-10" />
                    <img className="w-full aspect-[16/9] object-cover" alt={post.content.trip.title} src={post.content.trip.coverImage || "https://images.unsplash.com/photo-1542749191-320c458c8435"} />
                    <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 md:p-6 bg-gradient-to-t from-black via-black/40 to-transparent">
                        <div className="w-full">
                                <div className="flex items-center gap-2 mb-2"><span className="bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Trip</span></div>
                                <h3 className={cn("font-bold text-white mb-1 drop-shadow-md", compact ? "text-lg" : "text-xl md:text-2xl")}>{post.content.trip.title}</h3>
                        </div>
                    </div>
                </div>
                <TripView isOpen={isTripViewOpen} onClose={() => setIsTripViewOpen(false)} post={post} />
                </>
            )}

            {post.type === 'event' && post.content?.event && (() => {
  const ev = post.content.event;

  const start = ev.startAt ? new Date(ev.startAt) : null;
  const end = ev.endAt ? new Date(ev.endAt) : null;

  const dateText = start
    ? start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD';

  const timeText = start
    ? start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '';

  const endText = end
    ? end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '';

  const hasCapacity = typeof ev.capacity === 'number' && ev.capacity > 0;
  const attendee = typeof ev.attendeeCount === 'number' ? ev.attendeeCount : 0;
  const capText = hasCapacity ? `${attendee}/${ev.capacity} going` : `${attendee} going`;

  const locationLine = ev.locationName || ev.locationAddress || '';
  const addressLine = ev.locationName && ev.locationAddress ? ev.locationAddress : '';
  const isPaid = !!ev.isPaid;

  return (
    <div className="mt-3 border border-border rounded-xl overflow-hidden bg-card/50">
      <div className={cn("relative", compact ? "h-32" : "h-56")}>
        <img
          src={ev.coverImage || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30"}
          alt={ev.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* top badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-primary text-black border-primary font-bold">Event</Badge>
          {isPaid ? (
            <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
              Paid • {ev.currency} {Number(ev.price || 0).toLocaleString()}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-black/50 text-white border-white/20">
              Free
            </Badge>
          )}
        </div>

        {/* bottom meta */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className={cn("font-bold text-white drop-shadow truncate", compact ? "text-base" : "text-xl")}>
              {ev.title}
            </h3>
            <div className="text-white/80 text-xs md:text-sm flex flex-wrap gap-x-2 gap-y-1 mt-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {dateText}{timeText ? ` • ${timeText}${endText ? `–${endText}` : ""}` : ""}
              </span>
              {locationLine && (
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{locationLine}</span>
                </span>
              )}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleRSVP}
            variant={isGoing ? "secondary" : "default"}
            className={cn("gap-2 shrink-0", compact ? "h-7 text-xs px-2" : "")}
          >
            {isGoing ? <CheckCircle className="h-3 w-3" /> : <Ticket className="h-3 w-3" />}
            {isGoing ? "Going" : "RSVP"}
          </Button>
        </div>
      </div>

      <div className={cn("space-y-3", compact ? "p-3" : "p-5")}>
        {/* description */}
        {ev.description && (
          <p className={cn("text-muted-foreground whitespace-pre-wrap", compact ? "text-xs" : "text-sm")}>
            {ev.description}
          </p>
        )}

        {/* details grid */}
        <div className="grid grid-cols-2 gap-3 text-xs md:text-sm">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-muted-foreground">Attendance</div>
            <div className="font-semibold text-foreground mt-1">{capText}</div>
            {hasCapacity && attendee >= ev.capacity && (
              <div className="text-[11px] text-red-500 mt-1">Capacity reached</div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-muted-foreground">Entry</div>
            <div className="font-semibold text-foreground mt-1">
              {isPaid ? `${ev.currency} ${Number(ev.price || 0).toLocaleString()}` : "Free"}
            </div>
          </div>

          {(addressLine || ev.lat || ev.lng) && (
            <div className="col-span-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="text-muted-foreground">Location details</div>
              {addressLine ? (
                <div className="font-medium text-foreground mt-1">{addressLine}</div>
              ) : null}
              {(ev.lat != null && ev.lng != null) && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  GPS: {ev.lat}, {ev.lng}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
})()}

        </>
    );

    if (!isBlurred) return content;

    return (
        <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
             {/* Blurred Content Placeholder */}
             <div className="filter blur-[20px] pointer-events-none select-none opacity-50">
                 {content}
                 {!content && <div className="h-48 bg-zinc-800 w-full" />}
             </div>
             
             {/* Overlay */}
             <div 
                className="absolute inset-0 z-10 bg-black/85 flex flex-col items-center justify-center text-center p-6 cursor-pointer hover:bg-black/80 transition-colors"
                onClick={handleBlurClick}
             >
                {post.isNSFW && (
                    <>
                        <ShieldAlert className="h-12 w-12 text-red-500 mb-3" />
                        <h3 className="text-xl font-bold text-white mb-1">Sensitive Content</h3>
                        <p className="text-zinc-400 text-sm mb-4">This content has been marked as NSFW.</p>
                        <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-500">
                            <Eye className="mr-2 h-4 w-4" /> View Anyway
                        </Button>
                    </>
                )}
                {!post.isNSFW && post.isSubscriberOnly && (
                    <>
                        <Lock className="h-12 w-12 text-yellow-500 mb-3" />
                        <h3 className="text-xl font-bold text-white mb-1">Subscriber Only</h3>
                        <p className="text-zinc-400 text-sm mb-4">Subscribe to {post.user.name} to view this exclusive content.</p>
                        <Button className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-none">
                            Unlock Content
                        </Button>
                    </>
                )}
             </div>
        </div>
    );
  };

  return (
    <>
      <motion.article layout className={cn("bg-card border border-border rounded-xl mb-6 hover:shadow-glow-gold-lg transition-shadow", compact ? "p-4" : "p-5 md:p-6", post.type === 'mint' ? 'border-primary/20 bg-zinc-950' : '')} whileHover={{ borderColor: 'hsl(var(--primary) / 0.4)' }}>
        <div className="flex items-start justify-between mb-2">
          <Link to={`/profile/${post.user.username}`} className="flex items-start space-x-2 md:space-x-3 group min-w-0">
            <Avatar className={cn("border border-border group-hover:border-primary transition-colors", compact ? "w-8 h-8" : "w-10 h-10 md:w-12 md:h-12", post.type === 'mint' ? "border-primary/50" : "")}>
              <AvatarImage src={`${post.user.avatar}`} />
              <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="pt-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("font-bold text-foreground group-hover:text-primary transition-colors truncate", compact ? "text-sm" : "text-base")}>{post.user.name}</span>
                {post.user.verified && <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-primary shrink-0" fill="currentColor" />}
              </div>
              <div className="flex items-center text-[10px] md:text-sm text-muted-foreground gap-1 flex-wrap">
                 <span>@{post.user.username}</span>
                 <span>·</span>
                 <span>{post.timestamp}</span>
                 {post.location && post.type !== 'mint' && (<><span>·</span><div className="flex items-center gap-0.5 hover:text-primary cursor-pointer transition-colors" onClick={handleLocationClick}><MapPin className="h-3 w-3" /><span className="truncate max-w-[100px]">{post.location}</span></div></>)}
                 {post.mintData && post.mintData.location && post.type === 'mint' && (<><span>·</span><div className="flex items-center gap-0.5 text-primary"><MapPin className="h-3 w-3" /><span className="truncate max-w-[120px]">{post.mintData.location.name}</span></div></>)}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {/* Mint Badges */}
            {post.type === 'mint' && (
                <Badge variant="outline" className="border-primary text-primary text-[10px] font-bold flex items-center gap-1">
                    <Aperture className="h-3 w-3" /> VERIFIED MINT
                </Badge>
            )}
            {post.type !== 'mint' && post.mintData && (
                <Badge variant="secondary" className="bg-black/50 border-white/20 text-[10px] font-bold text-muted-foreground flex items-center gap-1 cursor-pointer" onClick={() => setIsMintModalOpen(true)}>
                    <Database className="h-3 w-3" /> UNVERIFIED MINT
                </Badge>
            )}

            {post.isNSFW && <span className="text-[10px] border border-red-500 text-red-500 px-1 rounded font-bold">NSFW</span>}
            {post.isSubscriberOnly && <span className="text-[10px] border border-yellow-500 text-yellow-500 px-1 rounded font-bold">SUB</span>}
            <MoreOptionsDropdown post={post} isOwnProfile={isOwnProfile} />
          </div>
        </div>

        <div className={cn("space-y-2", compact ? "ml-0" : "ml-0 md:ml-14")}>
          {post.content?.text && <p className={cn("leading-relaxed whitespace-pre-wrap", compact ? "text-sm" : "text-base", post.type === 'mint' ? "font-serif text-lg italic text-white/90" : "")}>{post.content.text}</p>}
          {renderContent()}
        </div>

        <div className={cn("flex items-center justify-between pt-3 mt-2 border-t border-border/50", compact ? "ml-0" : "md:ml-14")}>
          <div className="flex gap-0 md:gap-4">
            <Button variant="ghost" size="sm" onClick={handleLike} disabled={isLikeLoading} className={cn(`flex items-center gap-1.5 px-2 hover:bg-red-500/10 ${isGlobalLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`, compact ? "h-8" : "")}>
              {isLikeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn(isGlobalLiked ? 'fill-current' : '', compact ? "h-4 w-4" : "h-5 w-5")} />}
              <span className="font-medium text-xs md:text-sm">{likeCount.toLocaleString()}</span>
            </Button>
            <CommentsSheet post={post} onLoginRequest={onLoginRequest}>
                <Button variant="ghost" size="sm" className={cn("flex items-center gap-1.5 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10", compact ? "h-8" : "")}>
                    <MessageCircle className={cn(compact ? "h-4 w-4" : "h-5 w-5")} /><span className="font-medium text-xs md:text-sm">{(post?.engagement?.comments ?? 0).toLocaleString()}</span>
                </Button>
            </CommentsSheet>
            
            {/* Gift Button - Disabled/Hidden for Own Profile */}
            {!isOwnProfile && (
                <Button variant="ghost" size="sm" onClick={handleGiftClick} className={cn("flex items-center gap-1.5 px-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10", compact ? "h-8" : "")}>
                    <Gift className={cn(compact ? "h-4 w-4" : "h-5 w-5")} /><span className={cn("font-medium", compact ? "hidden" : "text-sm")}>Gift</span>
                </Button>
            )}
            
          </div>
          <ShareDialog postUrl={postUrl} postTitle={post.content?.text || post.title || 'Check this out!'}>
              <Button variant="ghost" size="sm" className={cn("flex items-center gap-1.5 px-2 text-muted-foreground hover:text-primary hover:bg-primary/10", compact ? "h-8" : "")}>
                  <Share2 className={cn(compact ? "h-4 w-4" : "h-5 w-5")} /><span className={cn("font-medium", compact ? "hidden" : "text-sm")}>{post.engagement.shares.toLocaleString()}</span>
              </Button>
          </ShareDialog>
        </div>
      </motion.article>
      <GiftDialog
        isOpen={isGiftDialogOpen}
        onOpenChange={setIsGiftDialogOpen}
        recipientId={post.user._id}
        recipientName={post.user.name}
        recipientUsername={post.user.username}
        targetType="video"
        targetId={post._id}
      />
      <MintedCollectibleModal isOpen={isMintModalOpen} onClose={() => setIsMintModalOpen(false)} data={post.mintData} />
    </>
  );
};

export default FeedItem;
