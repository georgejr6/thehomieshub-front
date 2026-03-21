import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart, Upload, Users, DollarSign, Settings, Video,
  Image as ImageIcon, Trash2, Clapperboard, Loader2, RefreshCcw,
  Radio, MonitorPlay, Laptop, StopCircle, ExternalLink, Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MonetizationTab from '@/components/CreatorStudio/MonetizationTab';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import { useNavigate } from 'react-router-dom';
import api from '@/api/homieshub';

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return '';
  }
}

const CreatorStudioPage = ({ onLoginRequest }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');

  // Live tab state
  const [liveHistory, setLiveHistory] = useState([]);
  const [activeStream, setActiveStream] = useState(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [endingStreamId, setEndingStreamId] = useState(null);

  const loadLiveData = async () => {
    setLoadingLive(true);
    try {
      const [myStream, history] = await Promise.all([
        api.get('/live/my-stream'),
        api.get('/live/history'),
      ]);
      const s = myStream.data?.result?.stream;
      setActiveStream(s && s.status !== 'disabled' ? s : null);
      setLiveHistory(history.data?.result?.streams || []);
    } catch (_) {}
    finally { setLoadingLive(false); }
  };

  const handleEndStream = async (streamId) => {
    if (!window.confirm('End this live stream?')) return;
    setEndingStreamId(streamId);
    try {
      await api.delete(`/live/${streamId}`);
      await loadLiveData();
    } catch (_) {}
    finally { setEndingStreamId(null); }
  };

  // Content tab state
  const [contentCategory, setContentCategory] = useState('videos'); // videos | reels | posts
  const [myContent, setMyContent] = useState({ videos: [], reels: [], posts: [] });
  const [loadingMyContent, setLoadingMyContent] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [contentError, setContentError] = useState('');

  const counts = useMemo(
    () => ({
      videos: safeArray(myContent.videos).length,
      reels: safeArray(myContent.reels).length,
      posts: safeArray(myContent.posts).length,
    }),
    [myContent]
  );

  const currentItems = useMemo(() => {
    if (contentCategory === 'videos') return safeArray(myContent.videos);
    if (contentCategory === 'reels') return safeArray(myContent.reels);
    return safeArray(myContent.posts);
  }, [contentCategory, myContent]);

  const loadMyContent = async () => {
    setLoadingMyContent(true);
    setContentError('');
    try {
      const resp = await api.get('/user/my-content');
      const result = resp?.data?.result || resp?.data || {};
      setMyContent({
        videos: safeArray(result?.videos),
        reels: safeArray(result?.reels),
        posts: safeArray(result?.posts),
      });
    } catch (e) {
      console.error('Failed to load my content', e);
      setContentError(e?.response?.data?.message || e?.message || 'Failed to load your content.');
      setMyContent({ videos: [], reels: [], posts: [] });
    } finally {
      setLoadingMyContent(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'content') loadMyContent();
    if (activeTab === 'live') loadLiveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleDelete = async ({ type, id }) => {
    if (!id) return;

    const ok = window.confirm('Delete this content? This cannot be undone.');
    if (!ok) return;

    const endpoint =
      type === 'videos'
        ? `/user/videos/${id}`
        : type === 'reels'
        ? `/user/reels/${id}`
        : `/user/posts/${id}`;

    try {
      setDeletingId(String(id));
      await api.delete(endpoint);

      // remove from UI
      setMyContent((prev) => ({
        ...prev,
        [type]: safeArray(prev?.[type]).filter((x) => String(x?._id || x?.id) !== String(id)),
      }));
    } catch (e) {
      console.error('Delete failed', e);
      alert(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const getCardData = (item) => {
    // Normalize display fields across types
    const id = item?._id || item?.id;

    if (contentCategory === 'videos') {
      return {
        id,
        title: item?.title || 'Untitled video',
        subtitle: item?.description || item?.caption || '',
        thumb: item?.thumbnailUrl || item?.thumbnail || null,
        createdAt: item?.createdAt,
      };
    }

    if (contentCategory === 'reels') {
      return {
        id,
        title: item?.title || 'Reel',
        subtitle: item?.caption || '',
        thumb: item?.thumbnailUrl || item?.thumbnail || null,
        createdAt: item?.createdAt,
      };
    }

    // posts
    const firstMediaUrl = Array.isArray(item?.media) ? item.media?.[0]?.url : null;
    return {
      id,
      title: item?.type ? String(item.type).toUpperCase() : 'Post',
      subtitle: item?.text || '',
      thumb: firstMediaUrl || null,
      createdAt: item?.createdAt,
    };
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center px-4">
        <h2 className="text-2xl font-bold">Creator Studio Access</h2>
        <p className="text-muted-foreground">You must be logged in to access the Creator Studio.</p>
        <Button onClick={onLoginRequest}>Log In</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Creator Studio</h1>
            <p className="text-muted-foreground mt-1">Manage your content, analytics, and earnings all in one place.</p>
          </div>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Content
        </Button>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5" />
            Live
            {activeStream?.status === 'active' && (
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="monetization">Monetization</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview tab (unchanged from your file) */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Video className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45.2K</div>
                <p className="text-xs text-muted-foreground">+20.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">+180.1% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$1,240.50</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12.5%</div>
                <p className="text-xs text-muted-foreground">+2.4% from last month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Content Performance</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Chart Placeholder (Analytics)
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Comments</CardTitle>
                <CardDescription>You made 265 sales this month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 text-sm">
                    <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                    <div>
                      <p className="font-semibold">user123</p>
                      <p className="text-muted-foreground">Great video! Keep it up.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 text-sm">
                    <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
                    <div>
                      <p className="font-semibold">travel_fan</p>
                      <p className="text-muted-foreground">Where is this location?</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ✅ Content tab (new) */}
        {/* ── LIVE TAB ── */}
        <TabsContent value="live" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Live Streams</h2>
              <p className="text-sm text-muted-foreground">Manage your active stream and view your history.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadLiveData} disabled={loadingLive}>
                <RefreshCcw className={`h-4 w-4 ${loadingLive ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => navigate('/studio/stream')} className="gap-2">
                <Radio className="h-4 w-4" /> Go Live
              </Button>
            </div>
          </div>

          {loadingLive ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Active / Idle stream */}
              {activeStream ? (
                <Card className={activeStream.status === 'active' ? 'border-red-500/50 bg-red-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {activeStream.status === 'active' ? (
                            <Badge className="bg-red-600 text-white animate-pulse">● LIVE</Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">IDLE</Badge>
                          )}
                          <span className="font-bold text-lg">{activeStream.title || 'Untitled Stream'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {activeStream.streamMode === 'browser' ? (
                            <span className="flex items-center gap-1"><MonitorPlay className="h-3.5 w-3.5" /> Browser Stream</span>
                          ) : (
                            <span className="flex items-center gap-1"><Laptop className="h-3.5 w-3.5" /> Software Stream</span>
                          )}
                          {activeStream.status === 'active' && (
                            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {activeStream.viewerCount || 0} watching</span>
                          )}
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {fmtDate(activeStream.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => navigate('/studio/stream')} className="gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" /> Manage
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEndStream(activeStream.id)}
                          disabled={endingStreamId === activeStream.id}
                          className="gap-1.5"
                        >
                          {endingStreamId === activeStream.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
                          End Stream
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
                    <Radio className="h-10 w-10 text-muted-foreground/30" />
                    <div>
                      <p className="font-medium text-muted-foreground">No active stream</p>
                      <p className="text-sm text-muted-foreground/60 mt-1">Start a new stream from the Go Live page</p>
                    </div>
                    <Button onClick={() => navigate('/studio/stream')} className="gap-2">
                      <Radio className="h-4 w-4" /> Go Live Now
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Stream history */}
              {liveHistory.filter(s => s.status === 'disabled').length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Past Streams</h3>
                  <div className="space-y-2">
                    {liveHistory.filter(s => s.status === 'disabled').map((s) => (
                      <Card key={s.id} className="bg-muted/20">
                        <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{s.title || 'Untitled'}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              {s.streamMode === 'browser' ? <MonitorPlay className="h-3 w-3" /> : <Laptop className="h-3 w-3" />}
                              {fmtDate(s.createdAt)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">Ended</Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Your Content Library</CardTitle>
                <CardDescription>Manage your videos, reels, and community posts.</CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={contentCategory === 'videos' ? 'default' : 'outline'}
                  onClick={() => setContentCategory('videos')}
                  className="gap-2"
                >
                  <Video className="h-4 w-4" />
                  Videos ({counts.videos})
                </Button>

                <Button
                  variant={contentCategory === 'reels' ? 'default' : 'outline'}
                  onClick={() => setContentCategory('reels')}
                  className="gap-2"
                >
                  <Clapperboard className="h-4 w-4" />
                  Reels ({counts.reels})
                </Button>

                <Button
                  variant={contentCategory === 'posts' ? 'default' : 'outline'}
                  onClick={() => setContentCategory('posts')}
                  className="gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Posts ({counts.posts})
                </Button>

                <Button
                  variant="outline"
                  onClick={loadMyContent}
                  disabled={loadingMyContent}
                  className="gap-2"
                  title="Refresh"
                >
                  {loadingMyContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {contentError ? (
                <div className="py-6 text-center text-red-500">{contentError}</div>
              ) : null}

              {loadingMyContent ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Loading your content...
                </div>
              ) : currentItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No items found in this category.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {currentItems.map((item) => {
                    const { id, title, subtitle, thumb, createdAt } = getCardData(item);
                    const busy = deletingId && String(deletingId) === String(id);

                    return (
                      <Card key={id} className="overflow-hidden">
                        {thumb ? (
                          <div className="h-40 w-full bg-muted">
                            <img src={thumb} alt={title} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-40 w-full bg-muted flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8 opacity-50" />
                          </div>
                        )}

                        <CardHeader className="space-y-1">
                          <CardTitle className="text-base line-clamp-1">{title}</CardTitle>
                          <CardDescription className="line-clamp-2">{subtitle || '—'}</CardDescription>
                        </CardHeader>

                        <CardContent className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{fmtDate(createdAt)}</span>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            disabled={busy}
                            onClick={() => handleDelete({ type: contentCategory, id })}
                          >
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {busy ? 'Deleting...' : 'Delete'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monetization">
          <MonetizationTab />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Studio Settings</CardTitle>
              <CardDescription>Manage notifications and studio preferences.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>General settings configuration.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatorStudioPage;
