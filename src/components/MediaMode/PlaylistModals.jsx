import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMedia } from '@/contexts/MediaContext';
import { Plus, Music, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const CreatePlaylistModal = ({ isOpen, onClose }) => {
  const { createPlaylist } = useMedia();
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createPlaylist(name, image);
    toast({ title: "Playlist Created", description: `${name} has been added to your library.` });
    setName('');
    setImage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Playlist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-400">Name</Label>
            <Input 
                id="name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="My Awesome Mix" 
                className="bg-zinc-900 border-zinc-800 focus:border-red-500 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image" className="text-zinc-400">Thumbnail URL (Optional)</Label>
            <Input 
                id="image" 
                value={image} 
                onChange={e => setImage(e.target.value)} 
                placeholder="https://images.unsplash.com/..." 
                className="bg-zinc-900 border-zinc-800 focus:border-red-500 text-white"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white hover:bg-zinc-900">Cancel</Button>
            <Button type="submit" className="bg-white text-black hover:bg-zinc-200">Create Playlist</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ManagePlaylistsModal = ({ isOpen, onClose }) => {
    const { playlists, deletePlaylist } = useMedia();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { toast } = useToast();

    return (
      <>
        {/* Never unmount an OPEN Radix dialog (leaves body pointer-events:none →
            frozen UI). Instead close this one when the create dialog opens. */}
        <Dialog open={isOpen && !isCreateOpen} onOpenChange={(o) => { if (!o && !isCreateOpen) onClose(); }}>
             <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>My Playlists</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {playlists.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>You haven't created any playlists yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {playlists.map(playlist => (
                                <div
                                    key={playlist.id}
                                    className="flex items-center justify-between p-3 rounded-md bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                                >
                                    <div className="h-10 w-10 rounded bg-zinc-800 overflow-hidden shrink-0">
                                        {playlist.image ? <img src={playlist.image} alt={playlist.name} className="h-full w-full object-cover" /> : <Music className="h-5 w-5 m-auto mt-2.5 text-zinc-600"/>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate text-zinc-200">{playlist.name}</p>
                                        <p className="text-xs text-zinc-500">{playlist.items?.length || 0} tracks</p>
                                    </div>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="text-zinc-500 hover:text-red-500 hover:bg-zinc-800"
                                        onClick={() => {
                                            deletePlaylist(playlist.id);
                                            toast({ title: "Playlist Deleted", description: `"${playlist.name}" removed.` });
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="w-full bg-white text-black hover:bg-zinc-200"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Create New Playlist
                    </Button>
                </div>
             </DialogContent>
        </Dialog>
        <CreatePlaylistModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </>
    );
};

export const AddToPlaylistModal = ({ isOpen, onClose, mediaToAdd }) => {
    const { playlists, addToPlaylist } = useMedia();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { toast } = useToast();

    const handleAdd = (playlistId) => {
        addToPlaylist(playlistId, mediaToAdd);
        toast({ title: "Added to Playlist", description: "Track saved successfully." });
        onClose();
    };

    return (
      <>
        {/* Never unmount an OPEN Radix dialog (leaves body pointer-events:none →
            frozen UI). Close this one when the create dialog opens instead. */}
        <Dialog open={isOpen && !isCreateOpen} onOpenChange={(o) => { if (!o && !isCreateOpen) onClose(); }}>
             <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add to Playlist</DialogTitle>
                    <p className="text-sm text-zinc-400">Select a playlist to add "{mediaToAdd?.title}".</p>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    {playlists.length === 0 ? (
                        <div className="text-center py-6 text-zinc-500">
                            <p>No playlists yet. Create one!</p>
                        </div>
                    ) : (
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                            {playlists.map(playlist => (
                                <button
                                    key={playlist.id}
                                    onClick={() => handleAdd(playlist.id)}
                                    className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-900 transition-colors text-left w-full group"
                                >
                                    <div className="h-10 w-10 rounded bg-zinc-800 overflow-hidden shrink-0">
                                        {playlist.image ? <img src={playlist.image} alt={playlist.name} className="h-full w-full object-cover" /> : <Music className="h-5 w-5 m-auto mt-2.5 text-zinc-600"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate text-zinc-200 group-hover:text-white">{playlist.name}</p>
                                        <p className="text-xs text-zinc-500">{playlist.items?.length || 0} tracks</p>
                                    </div>
                                    <Plus className="h-4 w-4 text-zinc-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            ))}
                        </div>
                    )}
                    <Button
                        onClick={() => setIsCreateOpen(true)}
                        className="w-full mt-4 bg-white text-black hover:bg-zinc-200"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Create New Playlist
                    </Button>
                </div>
             </DialogContent>
        </Dialog>
        <CreatePlaylistModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      </>
    );
};