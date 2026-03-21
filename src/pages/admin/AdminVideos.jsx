import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Star, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/api/homieshub';

const AdminVideos = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadVideos = useCallback(async (q = searchQuery, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/videos', { params: { q, page: p, limit } });
      if (data.status) {
        setVideos(data.result.items || []);
        setTotal(data.result.pagination?.total || 0);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load videos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    loadVideos();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadVideos(searchQuery, 1);
  };

  const handleFeature = async (video) => {
    try {
      const { data } = await api.patch(`/admin/videos/${video._id}`, { isFeatured: !video.isFeatured });
      if (data.status) {
        setVideos((prev) => prev.map((v) => v._id === video._id ? { ...v, isFeatured: !v.isFeatured } : v));
        toast({ title: video.isFeatured ? 'Unfeatured' : 'Featured', description: `"${video.title}" updated.` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update video.', variant: 'destructive' });
    }
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    try {
      const { data } = await api.delete(`/admin/videos/${video._id}`);
      if (data.status) {
        setVideos((prev) => prev.filter((v) => v._id !== video._id));
        toast({ title: 'Deleted', description: `"${video.title}" removed.` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete video.', variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Manage Videos</h1>
        <p className="text-muted-foreground mt-1">View and moderate video content.</p>
      </header>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => loadVideos()} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : videos.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No videos found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => (
                  <TableRow key={video._id}>
                    <TableCell className="font-medium text-foreground max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{video.title}</span>
                        {video.isFeatured && <Star className="h-4 w-4 text-yellow-400 fill-yellow-400 shrink-0" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={video.creator?.avatarUrl} />
                          <AvatarFallback>{video.creator?.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">@{video.creator?.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>{(video.stats?.views || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={video.visibility === 'public' ? 'default' : 'secondary'}>
                        {video.visibility}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleFeature(video)}>
                            {video.isFeatured ? 'Unfeature' : 'Feature'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(video)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{total} videos total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminVideos;
