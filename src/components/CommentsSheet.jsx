import React, { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Send, MoreVertical, Trash2, Flag, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useContent } from '@/contexts/ContentContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import api from '@/api/homieshub';

const CommentItem = ({ comment }) => {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(comment.likes || 0);
const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const { deleteComment } = useContent();

    const handleLike = () => {
        if (!currentUser) {
            toast({ title: 'Login Required', description: 'Please log in to like comments.' });
            return;
        }
        setLiked(!liked);
        setLikeCount(prev => liked ? prev - 1 : prev + 1);
    }
    
    const handleAdminDelete = async () => {
        try {
            await api.delete(`/admin/comments/${comment.id}`);
            deleteComment(comment.id);
            toast({ title: 'Comment Deleted', variant: 'destructive' });
        } catch (err) {
            toast({ title: 'Failed to delete comment', description: err?.response?.data?.message || err.message, variant: 'destructive' });
        }
    }
    
    const handleReport = () => {
        toast({
            title: 'Comment Reported',
            description: 'Thank you for your feedback. We will review this comment.',
        });
    }
    useEffect(() => {
        console.log("Comment item rendered for", comment);
    }, []);
    return (
        <div className="flex items-start gap-3 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Link to={`/profile/${comment.user?.username}`}>
                <Avatar className="h-9 w-9 cursor-pointer">
                    <AvatarImage src={comment.user?.avatarUrl} alt={comment.user?.name} />
                    <AvatarFallback>{comment.user?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1">
                <p className="text-sm">
                    <Link to={`/profile/${comment.user?.username}`} className="font-semibold hover:underline mr-2">
                        {comment.user?.name || 'Unknown User'}
                    </Link>
                    <span className="text-foreground/90">{comment.text}</span>
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                    <span>{comment.timestamp}</span>
                    <span className="font-medium">{likeCount} likes</span>
                    <button className="font-medium hover:text-primary transition-colors">Reply</button>
                </div>
            </div>
            <div className="flex items-center">
                <button onClick={handleLike} className="flex items-center gap-1 text-muted-foreground hover:text-red-500 transition-colors p-1">
                    <Heart className={cn("h-4 w-4", liked ? "text-red-500 fill-current" : "")} />
                </button>
                {currentUser && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {currentUser.isAdmin ? (
                                <DropdownMenuItem className="text-destructive" onClick={handleAdminDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Comment
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem className="text-destructive" onClick={handleReport}>
                                    <Flag className="mr-2 h-4 w-4" /> Report Comment
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    )
}

const CommentsSheet = ({ children, post,targetType = "community_post", onLoginRequest, isLiveChat, isOpen, onOpenChange }) => {
  const { user: currentUser } = useAuth();
  const { fetchComments, addComment, comments: allContextComments } = useContent();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [localComments, setLocalComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [hasFetched, setHasFetched] = useState(false);
  const inputRef = useRef(null);

  // Determine if we are showing/controlled by parent or local state
  const show = isLiveChat ? isOpen : isSheetOpen;

  useEffect(() => {
    if (show && post?.id) {
        loadComments();
    }
  }, [show, post?.id]);

  // If it's live chat, we might want to sync with global context comments in real-time (simulated)
  // For standard posts, we fetch once on open.
  useEffect(() => {
      if (isLiveChat && show) {
          // Filter global comments for this live stream from context in real-time
          const liveComments = allContextComments.filter(c => c.postId === post.id || c.postId === 'all');
          setLocalComments(liveComments);
      }
  }, [allContextComments, isLiveChat, show, post?.id]);


  const loadComments = async () => {
      if (isLiveChat) return; // Live chat uses direct context sync
      
      setIsLoading(true);
      try {
          const targetId = post?.id || post?._id;
if (!targetId) return;

const data = await fetchComments({
  targetType: targetType,
  targetId,
  page: 1,
  limit: 50,
});

setLocalComments(data);
          setHasFetched(true);
      } catch (error) {
          console.error("Failed to load comments", error);
      } finally {
          setIsLoading(false);
      }
  };

  const handleOpenChange = (openState) => {
    if (isLiveChat) {
      if(onOpenChange) onOpenChange(openState);
      return;
    }
    
    if (openState && !currentUser) {
        onLoginRequest();
        return;
    } 
    
    setIsSheetOpen(openState);
    if (!openState) {
        // Reset state when closing if desired, or keep cache
        setHasFetched(false); 
    }
  }

  const handleSubmitComment = async (e) => {
      e.preventDefault();
      if (!newCommentText.trim()) return;
      if (!currentUser) {
          onLoginRequest();
          return;
      }

      setIsSubmitting(true);
      try {
          // Simulate POST /api/posts/:id/comment
          const targetId = post?.id || post?._id;
if (!targetId) return;

const addedComment = await addComment({
  targetType: targetType,
  targetId,
  text: newCommentText.trim(),
});

          
          // Refresh list locally
          if (!isLiveChat) {
              const patched = {
  ...addedComment,
  user:  currentUser, // 👈 use logged-in user as fallback
};

setLocalComments(prev => [patched, ...prev]);
          }
          setNewCommentText('');
          
          // Scroll to top or focus
          if(inputRef.current) inputRef.current.focus();

      } catch (error) {
          console.error("Failed to post comment", error);
      } finally {
          setIsSubmitting(false);
      }
  };

  const renderContent = () => (
    <>
      {!isLiveChat && (
        <SheetHeader className="text-center border-b pb-4">
            <SheetTitle>Comments ({localComments.length})</SheetTitle>
        </SheetHeader>
      )}
      
      <div className="flex-1 overflow-y-auto px-4 divide-y scrollbar-hide">
          {isLoading && !hasFetched ? (
              <div className="flex flex-col items-center justify-center h-40 space-y-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm">Loading comments...</p>
              </div>
          ) : localComments.length > 0 ? (
              localComments.map(comment => (
                  <CommentItem key={comment.id} comment={comment}/>
              ))
          ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10 text-center">
                  <div className="bg-muted/50 p-4 rounded-full mb-3">
                    <MoreVertical className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="font-medium">No comments yet</p>
                  <p className="text-xs max-w-[200px]">Be the first to start the conversation.</p>
              </div>
          )}
      </div>

      <div className={cn("p-4 bg-background border-t", isLiveChat ? "pb-2" : "pb-6")}>
          <form onSubmit={handleSubmitComment} className="flex items-center gap-3 w-full relative">
                <Avatar className="h-8 w-8 hidden sm:block">
                    <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
                    <AvatarFallback>{currentUser?.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 relative">
                    <Input 
                        ref={inputRef}
                        placeholder={currentUser ? "Add a comment..." : "Log in to comment"} 
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        disabled={isSubmitting || !currentUser}
                        className="pr-10"
                    />
                    {isSubmitting && (
                         <div className="absolute right-3 top-1/2 -translate-y-1/2">
                             <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                         </div>
                    )}
                </div>
                <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!newCommentText.trim() || isSubmitting || !currentUser}
                    className={cn("shrink-0 transition-all", newCommentText.trim() ? "bg-primary" : "bg-muted text-muted-foreground hover:bg-muted")}
                >
                    <Send className="h-4 w-4" />
                </Button>
          </form>
      </div>
    </>
  );

  // If it's a live chat, render content directly without sheet wrapper
  if (isLiveChat) {
    return (
      <div className={cn("flex-1 flex flex-col overflow-hidden h-full", isOpen ? "block" : "hidden")}>
        {renderContent()}
      </div>
    );
  }

  // If it's a regular comments sheet, use the Sheet component
  return (
    <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      {currentUser && (
         <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0 sm:max-w-lg sm:mx-auto sm:rounded-t-xl">
            {renderContent()}
          </SheetContent>
      )}
    </Sheet>
  );
};

export default CommentsSheet;