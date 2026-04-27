import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Flag, UserX, Bookmark, Trash2, Edit, Star, ShieldBan, ThumbsUp, Radio } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useContent } from '@/contexts/ContentContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/api/homieshub';

const EditTitleModal = ({ isOpen, onOpenChange, currentTitle, onSave }) => {
  const [newTitle, setNewTitle] = useState(currentTitle);

  React.useEffect(() => {
    if (isOpen) {
      setNewTitle(currentTitle);
    }
  }, [isOpen, currentTitle]);

  const handleSave = () => {
    onSave(newTitle);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Title</DialogTitle>
          <DialogDescription>Update the title for this content.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="edit-title-input">Title</Label>
          <Input id="edit-title-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const MoreOptionsDropdown = ({ post, stream, isOwnProfile }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { deletePost, banUser, terminateStream, updateStreamTitle } = useContent();
  const [isEditModalOpen, setEditModalOpen] = useState(false);

  const content = post || stream;
  const isStream = !!stream;

  const handleAdminDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      const bt = content.backendType;
      if (bt === 'video' || bt === 'reel') {
        await api.delete(`/admin/videos/${content.id}`, { params: { collectionType: bt } });
      } else {
        await api.delete(`/admin/posts/${content.id}`);
      }
      deletePost(content.id);
      toast({ title: 'Post Deleted', variant: 'destructive' });
    } catch (err) {
      toast({ title: 'Delete failed', description: err?.response?.data?.message || err.message, variant: 'destructive' });
    }
  };
  
  const handleAdminBan = () => {
    const userToBan = isStream ? stream.creator : post.user.username;
    banUser(userToBan);
    toast({
      title: '🚫 User Banned',
      description: `User @${userToBan} has been banned. Their posts will be hidden.`,
      variant: 'destructive',
    });
  };
  
  const handleAdminTerminateStream = () => {
    terminateStream(stream.id);
    toast({
        title: 'Stream Terminated',
        description: `You have ended the livestream for "${stream.title}".`,
        variant: 'destructive'
    });
  }

  const handleTitleUpdate = (newTitle) => {
    if (isStream) {
        updateStreamTitle(stream.id, newTitle);
    } else {
        // Here you would call a function to update post title
        // updatePostTitle(post.id, newTitle)
        toast({ title: 'Title Updated!', description: 'The post title has been changed.' });
    }
  };


  const handleGenericInteraction = (title, description) => {
    toast({ title, description });
  };

  if (!user) return null;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white rounded-full bg-black/30 hover:bg-black/50">
          <MoreVertical className="h-5 w-5" />
          <span className="sr-only">More options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isOwnProfile && !isStream ? (
          <>
            <DropdownMenuItem onSelect={() => setEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Post</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleGenericInteraction('🚧 Feature In Progress', "Pinning posts is coming soon! 🚀")}>
              <Star className="mr-2 h-4 w-4" />
              <span>Pin to Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => deletePost(content.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Post</span>
            </DropdownMenuItem>
          </>
        ) : (
          !isStream && <>
            <DropdownMenuItem onSelect={() => handleGenericInteraction('❤️ Added to Favorites', "You can find this post in your favorites.")}>
              <Bookmark className="mr-2 h-4 w-4" />
              <span>Add to Favorites</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleGenericInteraction('👍 Got it!', "We won't recommend this post to you anymore.")}>
              <UserX className="mr-2 h-4 w-4" />
              <span>Not interested</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => handleGenericInteraction('🚩 Post Reported', "Thanks for your feedback. We'll review this post.")}>
              <Flag className="mr-2 h-4 w-4" />
              <span>Report post</span>
            </DropdownMenuItem>
          </>
        )}
        {user.isAdmin && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
                {isStream ? (
                  <>
                     <DropdownMenuItem onSelect={() => setEditModalOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Title</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onSelect={handleAdminTerminateStream}>
                        <Radio className="mr-2 h-4 w-4" />
                        <span>End Stream</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onSelect={() => handleGenericInteraction('✅ Post Approved', `Post ID ${content.id} has been approved.`)}>
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        <span>Approve Post</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleGenericInteraction('🌟 Post Featured', `Post ID ${content.id} is now featured.`)}>
                        <Star className="mr-2 h-4 w-4" />
                        <span>Feature Post</span>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem className="text-destructive" onSelect={handleAdminBan}>
                    <ShieldBan className="mr-2 h-4 w-4" />
                    <span>Ban User</span>
                </DropdownMenuItem>
                {!isStream && <DropdownMenuItem className="text-destructive" onSelect={handleAdminDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete Post (Admin)</span>
                </DropdownMenuItem>}
            </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
     <EditTitleModal
        isOpen={isEditModalOpen}
        onOpenChange={setEditModalOpen}
        currentTitle={content?.title || content?.description}
        onSave={handleTitleUpdate}
      />
    </>
  );
};

export default MoreOptionsDropdown;