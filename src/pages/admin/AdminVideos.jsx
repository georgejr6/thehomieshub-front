import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Star, Loader2, RefreshCw, Camera, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/api/homieshub';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (s) => { const t = Math.floor(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

function useDebounced(value, delay = 150) {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef(null);
  const set = (v) => { clearTimeout(timer.current); timer.current = setTimeout(() => setDebounced(v), delay); };
  return [debounced, set];
}

const VIDEO_TYPE_LABELS = { video: 'Standard', short: 'Short', movie: 'Movie' };
const VIDEO_TYPE_COLORS = { video: 'secondary', short: 'default', movie: 'outline' };

// ── Thumbnail Scrubber Modal ───────────────────────────────────────────────────

const ThumbnailModal = ({ video, onClose, onSave }) => {
  const [seconds, setSeconds] = useState(0);
  const [previewSec, schedulePreview] = useDebounced(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handle = (v) => { setSeconds(v); schedulePreview(v); };

  const handleSave = async () => {
    if (!video.muxPlaybackId) return;
    setSaving(true);
    const url = `https://image.mux.com/${video.muxPlaybackId}/thumbnail.png?time=${Math.round(seconds)}&width=1920`;
    try {
      const { data } = await api.patch(`/admin/videos/${video._id}`, {
        thumbnailUrl: url,
        _collectionType: video._collectionType,
      });
      if (data.status) {
        onSave(video._id, url);
        toast({ title: 'Thumbnail saved', description: `Frame at ${fmt(seconds)} set as thumbnail.` });
        onClose();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save thumbnail.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Set Thumbnail</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <p className="text-sm text-muted-foreground truncate">{video.title}</p>

        {video.muxPlaybackId ? (
          <div className="space-y-4">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted border border-border">
              <img
                key={previewSec}
                src={`https://image.mux.com/${video.muxPlaybackId}/thumbnail.png?time=${previewSec}&width=800`}
                alt="frame preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <input
                type="range" min="0" max="3600" step="1" value={seconds}
                onChange={e => handle(Number(e.target.value))}
                className="w-full cursor-pointer accent-primary"
              />
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono tabular-nums text-foreground w-12">{fmt(seconds)}</span>
                <input
                  type="number" min="0" max="3600" value={seconds}
                  onChange={e => handle(Math.max(0, Math.min(3600, Number(e.target.value) || 0)))}
                  className="w-20 bg-background border border-border text-foreground text-sm rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">sec</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                Save Thumbnail
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No Mux playback ID — thumbnail scrubbing unavailable for this video.</p>
        )}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const AdminVideos = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [thumbModal, setThumbModal] = useState(null);
  const limit = 20;

  const loadVideos = useCallback(async (q = searchQuery, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/videos', { params: { q, page: p, limit } });
      if (data.status) {
        setVideos(data.result.items || []);
        setTotal(data.result.pagination?.total || 0);
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load videos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => { loadVideos(); }, [page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); loadVideos(searchQuery, 1); };

  const patch = async (video, body, optimistic) => {
    try {
      const { data } = await api.patch(`/admin/videos/${video._id}`, {
        ...body,
        _collectionType: video._collectionType,
      });
      if (data.status) {
        setVideos(prev => prev.map(v => v._id === video._id ? { ...v, ...optimistic } : v));
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update video.', variant: 'destructive' });
    }
  };

  const handleFeature = (video) => {
    patch(video, { isFeatured: !video.isFeatured }, { isFeatured: !video.isFeatured });
    toast({ title: video.isFeatured ? 'Unfeatured' : 'Featured', description: `"${video.title}" updated.` });
  };

  const handleVisibility = (video, visibility) => {
    patch(video, { visibility }, { visibility });
    toast({ title: `Set to ${visibility}`, description: `"${video.title}" is now ${visibility}.` });
  };

  const handleVideoType = (video, videoType) => {
    if (video._collectionType === 'reel') return;
    patch(video, { videoType }, { videoType });
    toast({ title: `Type → ${VIDEO_TYPE_LABELS[videoType]}`, description: `"${video.title}" updated.` });
  };

  const handleDelete = async (video) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    try {
      const { data } = await api.delete(`/admin/videos/${video._id}`, {
        params: { collectionType: video._collectionType || 'video' },
      });
      if (data.status) {
        setVideos(prev => prev.filter(v => v._id !== video._id));
        toast({ title: 'Deleted', description: `"${video.title}" removed.` });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete video.', variant: 'destructive' });
    }
  };

  const handleThumbnailSaved = (videoId, url) => {
    setVideos(prev => prev.map(v => v._id === videoId ? { ...v, thumbnailUrl: url } : v));
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
              <Input placeholder="Search videos..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : videos.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No videos found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {videos.map((video) => {
                  const thumbUrl = video.thumbnailUrl
                    || (video.muxPlaybackId ? `https://image.mux.com/${video.muxPlaybackId}/thumbnail.png?width=160&time=3` : null);
                  const vType = video.videoType || 'video';
                  return (
                    <TableRow key={video._id}>
                      <TableCell className="w-[100px]">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" className="w-24 h-14 object-cover rounded-md bg-muted" />
                        ) : (
                          <div className="w-24 h-14 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">No preview</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground max-w-[180px]">
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
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{video._collectionType || 'video'}</Badge>
                      </TableCell>
                      <TableCell>
                        {video._collectionType !== 'reel' ? (
                          <Badge variant={VIDEO_TYPE_COLORS[vType]} className="text-xs capitalize">
                            {VIDEO_TYPE_LABELS[vType] || vType}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                            {video.muxPlaybackId && (
                              <DropdownMenuItem onClick={() => setThumbModal(video)}>
                                <Camera className="h-3.5 w-3.5 mr-2" />Set Thumbnail
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {video._collectionType !== 'reel' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleVideoType(video, 'video')}
                                  className={vType === 'video' ? 'font-semibold' : ''}
                                >
                                  {vType === 'video' ? '✓ ' : ''}Standard Video
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleVideoType(video, 'short')}
                                  className={vType === 'short' ? 'font-semibold' : ''}
                                >
                                  {vType === 'short' ? '✓ ' : ''}Mark as Short
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleVideoType(video, 'movie')}
                                  className={vType === 'movie' ? 'font-semibold' : ''}
                                >
                                  {vType === 'movie' ? '✓ ' : ''}Mark as Movie
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {video.visibility !== 'private' && (
                              <DropdownMenuItem onClick={() => handleVisibility(video, 'private')}>
                                Make Private
                              </DropdownMenuItem>
                            )}
                            {video.visibility === 'private' && (
                              <DropdownMenuItem onClick={() => handleVisibility(video, 'public')}>
                                Make Public
                              </DropdownMenuItem>
                            )}
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
                  );
                })}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{total} videos total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {thumbModal && (
        <ThumbnailModal
          video={thumbModal}
          onClose={() => setThumbModal(null)}
          onSave={handleThumbnailSaved}
        />
      )}
    </div>
  );
};

export default AdminVideos;
