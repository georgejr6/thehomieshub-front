import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal, Search, Video, FileText, BarChart2, MessageCircle, MapPin, Trash2, Star, ShieldAlert, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/api/homieshub';

const getPostIcon = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'video': return <Video className="h-4 w-4 text-muted-foreground" />;
    case 'reel':  return <Video className="h-4 w-4 text-purple-400" />;
    case 'thread': return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'poll':   return <BarChart2 className="h-4 w-4 text-muted-foreground" />;
    case 'trip':   return <MapPin className="h-4 w-4 text-muted-foreground" />;
    case 'event':  return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
    default: return null;
  }
};

// Normalise a backend document into a flat display item
function normaliseItem(doc, kind) {
  const user = doc.creator || doc.author || {};
  return {
    id:       doc._id,
    kind,     // 'video' | 'reel' | 'post'
    type:     kind === 'video' ? 'Video' : kind === 'reel' ? 'Reel' : (doc.type || 'Thread'),
    label:    doc.title || doc.caption || doc.text || '(untitled)',
    isNSFW:   !!doc.isNSFW,
    isDeleted: !!doc.isDeleted,
    createdAt: doc.createdAt,
    user: {
      username: user.username || 'unknown',
      name:     user.name || user.username || 'Unknown',
      avatar:   user.avatarUrl || '',
    },
  };
}

const AdminContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchTerm, setSearchTerm]   = useState('');
  const [filterType, setFilterType]   = useState('all');
  const [actionLoading, setActionLoading] = useState(null); // id being actioned

  // ── Fetch all content ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [videosRes, communityRes] = await Promise.allSettled([
        api.get('/admin/videos?limit=200'),
        api.get('/user/community-posts?limit=200'),
      ]);

      const rawVideos = videosRes.status === 'fulfilled'
        ? (videosRes.value.data?.result?.items || [])
        : [];

      const rawPosts = communityRes.status === 'fulfilled'
        ? (communityRes.value.data?.result?.items || [])
        : [];

      const videos = rawVideos
        .filter(v => !v.isDeleted)
        .map(v => normaliseItem(v, v._collectionType === 'reel' ? 'reel' : 'video'));

      const posts = rawPosts
        .filter(p => !p.isDeleted)
        .map(p => normaliseItem(p, 'post'));

      setItems([...videos, ...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      toast({ title: 'Failed to load content', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actions ────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    setActionLoading(item.id);
    try {
      if (item.kind === 'post') {
        await api.delete(`/admin/posts/${item.id}`);
      } else {
        const collectionType = item.kind === 'reel' ? 'reel' : 'video';
        await api.delete(`/admin/videos/${item.id}?collectionType=${collectionType}`);
      }
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: 'Deleted', description: `"${item.label.slice(0, 60)}" has been removed.` });
    } catch (err) {
      toast({ title: 'Delete failed', description: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkNSFW = async (item) => {
    setActionLoading(item.id);
    try {
      if (item.kind === 'post') {
        await api.patch(`/admin/posts/${item.id}`, { isNSFW: true });
      } else {
        const collectionType = item.kind === 'reel' ? 'reel' : 'video';
        await api.patch(`/admin/videos/${item.id}`, { isNSFW: true, _collectionType: collectionType });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isNSFW: true } : i));
      toast({ title: 'Marked NSFW', description: 'Content is now blurred for all users.' });
    } catch (err) {
      toast({ title: 'Action failed', description: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnmarkNSFW = async (item) => {
    setActionLoading(item.id);
    try {
      if (item.kind === 'post') {
        await api.patch(`/admin/posts/${item.id}`, { isNSFW: false });
      } else {
        const collectionType = item.kind === 'reel' ? 'reel' : 'video';
        await api.patch(`/admin/videos/${item.id}`, { isNSFW: false, _collectionType: collectionType });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isNSFW: false } : i));
      toast({ title: 'NSFW removed' });
    } catch (err) {
      toast({ title: 'Action failed', description: err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Server error', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────
  const filtered = items.filter(item => {
    const matchesSearch =
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type.toLowerCase() === filterType;
    return matchesSearch && matchesType;
  });

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
        <p className="text-muted-foreground mt-1">Review, moderate, and remove content from the platform.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search content or users..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="reel">Reels</SelectItem>
                <SelectItem value="thread">Threads</SelectItem>
                <SelectItem value="poll">Polls</SelectItem>
                <SelectItem value="trip">Trips</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading content…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No content found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Content</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium truncate max-w-xs">
                      <div className="flex items-center gap-2">
                        <span className={item.isNSFW ? 'blur-sm select-none' : ''}>
                          {item.label}
                        </span>
                        {item.isNSFW && <Badge variant="destructive" className="text-[10px] h-5 flex-shrink-0">NSFW</Badge>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <button
                        className="flex items-center gap-2 hover:text-primary transition-colors text-left"
                        onClick={() => navigate(`/profile/${item.user.username}`)}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={item.user.avatar} />
                          <AvatarFallback>{item.user.username[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">@{item.user.username}</span>
                      </button>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getPostIcon(item.type)}
                        <span className="text-sm">{item.type}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {item.isNSFW
                        ? <Badge variant="destructive">NSFW</Badge>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>

                    <TableCell className="text-right">
                      {actionLoading === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Actions</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!item.isNSFW && (
                              <DropdownMenuItem
                                className="text-orange-500 focus:text-orange-500"
                                onClick={() => handleMarkNSFW(item)}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" /> Mark NSFW (blur)
                              </DropdownMenuItem>
                            )}
                            {item.isNSFW && (
                              <DropdownMenuItem onClick={() => handleUnmarkNSFW(item)}>
                                <ShieldAlert className="mr-2 h-4 w-4" /> Remove NSFW flag
                              </DropdownMenuItem>
                            )}
                            {item.kind !== 'post' && (
                              <DropdownMenuItem onClick={() => window.open(`/watch/${item.id}`, '_blank')}>
                                <ExternalLink className="mr-2 h-4 w-4" /> View post
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContent;
