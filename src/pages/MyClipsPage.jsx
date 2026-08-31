import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Scissors, Download, Share2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import BackButton from '@/components/BackButton';
import { listClipJobs, getClipJob } from '@/api/aiClips';

const POLL_MS = 7000;
const TERMINAL_STATUSES = ['done', 'error', 'expired'];

// Modeled on LibraryPage.jsx's EmptyTabState pattern -- same dashed-border,
// icon-in-circle, title/description/CTA shape.
const EmptyClipsState = ({ onAction }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-muted-foreground/25 rounded-xl bg-muted/5"
  >
    <div className="bg-muted/50 p-6 rounded-full mb-6 ring-1 ring-border">
      <Scissors className="h-10 w-10 text-muted-foreground/70" />
    </div>
    <h3 className="text-xl font-bold mb-2 text-foreground">No Clips Yet</h3>
    <p className="text-muted-foreground max-w-sm mx-auto mb-6 text-sm">
      Paste a video link into My AI's Clip It tab and I'll turn it into a clip for you.
    </p>
    <Button onClick={onAction} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold min-w-[160px]">
      Make a Clip
    </Button>
  </motion.div>
);

const STATUS_VARIANT = {
  queued: 'secondary',
  processing: 'secondary',
  done: 'default',
  error: 'destructive',
  expired: 'outline',
};

const STATUS_LABEL = {
  queued: 'Queued',
  processing: 'Processing',
  done: 'Done',
  error: 'Failed',
  expired: 'Expired',
};

const ClipCard = ({ job, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className="cursor-pointer rounded-xl overflow-hidden border border-border bg-card hover:border-primary/40 transition-colors"
  >
    <div className="aspect-video bg-muted flex items-center justify-center relative">
      {job.thumbnailUrl ? (
        <img src={job.thumbnailUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <Scissors className="h-8 w-8 text-muted-foreground/40" />
      )}
      <Badge variant={STATUS_VARIANT[job.status] || 'secondary'} className="absolute top-2 right-2">
        {STATUS_LABEL[job.status] || job.status}
      </Badge>
    </div>
    <div className="p-3">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {job.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : '—'}
      </p>
      {!TERMINAL_STATUSES.includes(job.status) && (
        <Progress value={job.progressPct || 0} className="h-1.5 mt-2" />
      )}
    </div>
  </motion.div>
);

const ClipsList = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [clipJobs, setClipJobs] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await listClipJobs();
        if (!mounted) return;
        setClipJobs(data?.status && Array.isArray(data.result?.clipJobs) ? data.result.clipJobs : []);
      } catch {
        if (mounted) setClipJobs([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <Helmet>
        <title>My Clips - The Homies Hub</title>
        <meta name="description" content="Clips you've made with Homies AI." />
      </Helmet>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Scissors className="h-8 w-8 text-primary" />
              My Clips
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Clips you've made from pasted links, ready to view, save, or share.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : clipJobs.length === 0 ? (
          <EmptyClipsState onAction={() => navigate('/AI?bot=clip')} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {clipJobs.map((job) => (
              <ClipCard key={job._id} job={job} onClick={() => navigate(`/clips/${job._id}`)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

const ClipDetail = ({ id }) => {
  const [clipJob, setClipJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const fetchOnce = async () => {
      try {
        const data = await getClipJob(id);
        if (!mounted) return;
        if (data?.status && data.result?.clipJob) {
          setClipJob(data.result.clipJob);
          if (TERMINAL_STATUSES.includes(data.result.clipJob.status)) stopPolling();
        } else {
          setNotFound(true);
          stopPolling();
        }
      } catch {
        if (mounted) setNotFound(true);
        stopPolling();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchOnce();
    pollRef.current = setInterval(fetchOnce, POLL_MS);

    return () => {
      mounted = false;
      stopPolling();
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (notFound || !clipJob) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto text-center py-16">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Clip not found</h2>
        <p className="text-muted-foreground text-sm">This clip may have expired or doesn't exist.</p>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(clipJob.status);

  return (
    <>
      <Helmet>
        <title>Clip - The Homies Hub</title>
      </Helmet>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" /> Clip
          </h1>
          <Badge variant={STATUS_VARIANT[clipJob.status] || 'secondary'}>
            {STATUS_LABEL[clipJob.status] || clipJob.status}
          </Badge>
        </div>

        {clipJob.status === 'done' && clipJob.resultUrl ? (
          <div className="rounded-xl overflow-hidden border border-border bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video controls src={clipJob.resultUrl} className="w-full max-h-[70vh]" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/20 p-8 text-center space-y-4">
            {clipJob.status === 'error' ? (
              <>
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground">
                  This clip failed to process. Your points were refunded to your wallet.
                </p>
              </>
            ) : clipJob.status === 'expired' ? (
              <p className="text-sm text-muted-foreground">This clip has expired and is no longer available.</p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  {clipJob.status === 'processing' ? 'Processing your clip…' : 'Queued — this will start shortly…'}
                </p>
                <Progress value={clipJob.progressPct || 0} className="h-2 max-w-xs mx-auto" />
                <p className="text-xs text-muted-foreground">{Math.round(clipJob.progressPct || 0)}%</p>
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            asChild={!!clipJob.resultUrl}
            disabled={!clipJob.resultUrl}
            variant="secondary"
            className="gap-2"
          >
            {clipJob.resultUrl ? (
              <a href={clipJob.resultUrl} download>
                <Download className="h-4 w-4" /> Save to device
              </a>
            ) : (
              <span><Download className="h-4 w-4" /> Save to device</span>
            )}
          </Button>

          {/* Phase 6 (social connect) placeholder -- visibly disabled, not wired up. */}
          <div className="flex items-center gap-2">
            <Button disabled variant="outline" className="gap-2 opacity-60 cursor-not-allowed">
              <Share2 className="h-4 w-4" /> Post to…
            </Button>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40 px-2 py-1 rounded-full border border-border/50">
              Coming soon
            </span>
          </div>
        </div>

        {!isTerminal && (
          <p className="text-xs text-muted-foreground">This page refreshes automatically while your clip is processing.</p>
        )}
      </div>
    </>
  );
};

const MyClipsPage = () => {
  const { id } = useParams();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 flex items-center gap-2 p-4 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <BackButton />
        <span className="text-sm font-semibold text-muted-foreground">
          {id ? 'Clip Detail' : 'My Clips'}
        </span>
      </div>
      {id ? <ClipDetail id={id} /> : <ClipsList />}
    </div>
  );
};

export default MyClipsPage;
