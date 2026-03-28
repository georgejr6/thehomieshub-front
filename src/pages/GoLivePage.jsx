
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Video, Mic, MicOff, Video as VideoIcon, VideoOff,
  MessageSquare, Radio, Share2, Copy, Check, Save,
  MonitorPlay, Laptop, AlertCircle, Signal, Info, HelpCircle,
  Wifi, ShieldCheck, Globe, Loader2, Clock, ExternalLink, ChevronDown, RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import BackButton from '@/components/BackButton';
import LiveChat from '@/components/LiveChat';
import api from '@/api/homieshub';
import MuxPlayer from '@mux/mux-player-react';

// --- Audio Level Indicator Component ---
const AudioLevelIndicator = ({ stream }) => {
  const [level, setLevel] = useState(0);
  const animationRef = useRef();
  const audioContextRef = useRef();
  const analyserRef = useRef();
  const sourceRef = useRef();

  useEffect(() => {
    if (!stream) {
      setLevel(0);
      return;
    }

    try {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;

        // Initialize Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const audioContext = audioContextRef.current;
        
        // Create analyzer only once
        if (!analyserRef.current) {
            analyserRef.current = audioContext.createAnalyser();
            analyserRef.current.fftSize = 256;
        }
        
        // Create source
        const mediaStreamSource = audioContext.createMediaStreamSource(stream);
        sourceRef.current = mediaStreamSource;
        mediaStreamSource.connect(analyserRef.current);

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const updateLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          
          // Normalize to 0-100 range roughly
          const normalizedLevel = Math.min(100, Math.max(0, average * 2.5));
          
          setLevel(normalizedLevel);
          animationRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
    } catch (e) {
        console.error("Audio Context Error:", e);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) {
          try { sourceRef.current.disconnect(); } catch (e) {}
      }
    };
  }, [stream]);

  // Determine color based on level
  const getColor = () => {
      if (level > 80) return "bg-red-500";
      if (level > 50) return "bg-yellow-500";
      return "bg-green-500";
  };

  return (
    <div className="flex items-center gap-2 h-full" title="Mic Level">
        <Mic className={cn("h-3 w-3", level > 5 ? "text-white" : "text-muted-foreground")} />
        <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
                className={cn("h-full transition-all duration-75 ease-out", getColor())} 
                style={{ width: `${level}%` }}
            />
        </div>
    </div>
  );
};

const GoLivePage = ({ onLoginRequest }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    // --- State ---
    const [streamMethod, setStreamMethod] = useState('webcam'); // 'webcam' | 'software'
    const [isLive, setIsLive] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showStreamKey, setShowStreamKey] = useState(false);
    const [streamData, setStreamData] = useState({ url: '', key: '', whipUrl: '' });
    const [liveStreamId, setLiveStreamId] = useState(null);
    const [isCreatingStream, setIsCreatingStream] = useState(false);
    const [isGoingLive, setIsGoingLive] = useState(false);
    const [softwareStreamStatus, setSoftwareStreamStatus] = useState('idle'); // 'idle' | 'active'
    const [softwarePlaybackId, setSoftwarePlaybackId] = useState(null);
    const pollRef = useRef(null);
    const wentLiveRef = useRef(false);

    // Webcam State
    const videoRef = useRef(null);
    const pcRef = useRef(null); // kept for cleanup compat
    const mediaRecorderRef = useRef(null);
    const broadcastWsRef = useRef(null);
    const [mediaStream, setMediaStream] = useState(null);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);
    const [permissionError, setPermissionError] = useState(null);
    const [usingFallback, setUsingFallback] = useState(false);
    const [videoDevices, setVideoDevices] = useState([]);
    const [audioDevices, setAudioDevices] = useState([]);
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');
    const [activeTab, setActiveTab] = useState('setup');
    const [showDeviceSettings, setShowDeviceSettings] = useState(false);
    const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = rear

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [notifyFollowers, setNotifyFollowers] = useState(true);
    const [discordAnnounce, setDiscordAnnounce] = useState(true);

    // History
    const [liveHistory, setLiveHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Admin-only features
    const isAdmin = user?.email === 'forthehomies96@gmail.com';
    const [donationBotEnabled, setDonationBotEnabled] = useState(false);
    const donationBotRef = useRef(null);
    const [viewerBoostInput, setViewerBoostInput] = useState('0');
    const [viewerBoostApplied, setViewerBoostApplied] = useState(0);

    // On mount: check if there's already an active/idle stream and resume it, also load history
    useEffect(() => {
        const resume = async () => {
            try {
                const { data } = await api.get('/live/my-stream');
                const s = data?.result?.stream;
                if (!s) return;
                setStreamData({ url: 'rtmps://global-live.mux.com:443/app', key: s.streamKey || '', whipUrl: s.whipEndpointUrl || '' });
                setLiveStreamId(s.id);
                setIsSaved(true);
                if (s.status === 'active') {
                    setIsLive(true);
                    setSoftwareStreamStatus('active');
                    setSoftwarePlaybackId(s.playbackId || null);
                }
                if (s.streamMode === 'software') setStreamMethod('software');
                if (s.title) setTitle(s.title);
                if (s.description) setDescription(s.description || '');
            } catch (_) {}
        };
        const fetchHistory = async () => {
            setHistoryLoading(true);
            try {
                const { data } = await api.get('/live/history');
                setLiveHistory(data?.result?.streams || []);
            } catch (_) {}
            finally { setHistoryLoading(false); }
        };
        resume();
        fetchHistory();
    }, []);

    // Attach stream to video element whenever mediaStream changes
    useEffect(() => {
        if (videoRef.current && mediaStream) {
            videoRef.current.srcObject = mediaStream;
        }
    }, [mediaStream, cameraEnabled]);

    useEffect(() => {
        return () => stopMediaTracks();
    }, []);

    // Auto-switch to chat tab when going live
    useEffect(() => {
        if (isLive) setActiveTab('chat');
    }, [isLive]);

    // Donation bot — fires every 5 min while enabled + live (admin only)
    const DONATION_MESSAGES = [
        "💛 Enjoying the stream? Show some love and send a donation! CashApp: $Homieshub or donate here → https://donate.stripe.com/fZu9ASbadcfU5VzbX4f7i09",
        "🙏 Your support keeps us going! Drop a donation to CashApp: $Homieshub or click → https://donate.stripe.com/fZu9ASbadcfU5VzbX4f7i09",
        "🔥 If you're vibing with this stream, show support! CashApp: $Homieshub | Donate: https://donate.stripe.com/fZu9ASbadcfU5VzbX4f7i09",
        "❤️ Every donation helps us keep building! Send to CashApp: $Homieshub or use the link → https://donate.stripe.com/fZu9ASbadcfU5VzbX4f7i09",
    ];
    const donationMsgIndexRef = useRef(0);

    useEffect(() => {
        if (!isAdmin || !isLive || !liveStreamId || !donationBotEnabled) {
            if (donationBotRef.current) { clearInterval(donationBotRef.current); donationBotRef.current = null; }
            return;
        }
        const sendBotMsg = () => {
            const msg = DONATION_MESSAGES[donationMsgIndexRef.current % DONATION_MESSAGES.length];
            donationMsgIndexRef.current += 1;
            api.post(`/live/${liveStreamId}/bot-message`, { content: msg }).catch(() => {});
        };
        sendBotMsg(); // fire once immediately
        donationBotRef.current = setInterval(sendBotMsg, 5 * 60 * 1000);
        return () => { clearInterval(donationBotRef.current); donationBotRef.current = null; };
    }, [isAdmin, isLive, liveStreamId, donationBotEnabled]);

    const applyViewerBoost = async () => {
        const boost = Math.max(0, parseInt(viewerBoostInput, 10) || 0);
        try {
            await api.post(`/live/${liveStreamId}/viewer-boost`, { boost });
            setViewerBoostApplied(boost);
            toast({ title: boost > 0 ? `Viewer boost set to +${boost}` : 'Viewer boost cleared' });
        } catch {
            toast({ title: 'Failed to apply boost', variant: 'destructive' });
        }
    };

    // Poll my-stream in software mode to detect when Restream/OBS connects
    useEffect(() => {
        if (streamMethod !== 'software' || !isSaved) {
            clearInterval(pollRef.current);
            return;
        }
        const poll = async () => {
            try {
                const { data } = await api.get('/live/my-stream');
                const s = data?.result?.stream;
                if (!s) return;
                setSoftwareStreamStatus(s.status);
                setSoftwarePlaybackId(s.playbackId || null);
                if (s.status === 'active' && !wentLiveRef.current) {
                    wentLiveRef.current = true;
                    setIsLive(true);
                    toast({ title: '🔴 You are Live!', description: 'Restream connected. Your stream is live.', className: 'bg-red-600 text-white border-none', duration: 10000 });
                }
                if (s.status === 'idle' && wentLiveRef.current) {
                    wentLiveRef.current = false;
                    setIsLive(false);
                    toast({ title: 'Stream Disconnected', description: 'Restream stopped sending video.' });
                }
            } catch (_) {}
        };
        poll();
        pollRef.current = setInterval(poll, 5000);
        return () => clearInterval(pollRef.current);
    }, [streamMethod, isSaved]);

    // --- Media Handling ---
    const stopMediaTracks = () => {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
            setMediaStream(null);
        }
    };

    useEffect(() => {
        return () => stopMediaTracks();
    }, []);

    const enumerateDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cams = devices.filter(d => d.kind === 'videoinput');
            const mics = devices.filter(d => d.kind === 'audioinput');
            setVideoDevices(cams);
            setAudioDevices(mics);
            if (cams.length > 0 && !selectedVideoDeviceId) setSelectedVideoDeviceId(cams[0].deviceId);
            if (mics.length > 0 && !selectedAudioDeviceId) setSelectedAudioDeviceId(mics[0].deviceId);
        } catch (_) {}
    };

    const startCamera = async (videoId, audioId, facing = facingMode) => {
        setPermissionError(null);
        try {
            const videoConstraints = videoId
                ? { deviceId: { exact: videoId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                : { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } };
            const stream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: audioId ? { deviceId: { exact: audioId } } : true,
            });
            if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
            setMediaStream(stream);
            setCameraEnabled(true);
            setMicEnabled(true);
            await enumerateDevices();
        } catch (err) {
            console.error('Media Error:', err);
            setPermissionError("Couldn't access camera or microphone. Check browser permissions.");
        }
    };

    const toggleCamera = async () => {
        if (cameraEnabled) {
            if (isLive && mediaStream) {
                // During live: stop video tracks only — keep audio flowing so stream stays up
                mediaStream.getVideoTracks().forEach(t => t.stop());
                setCameraEnabled(false);
                setUsingFallback(true);
            } else {
                stopMediaTracks();
                setCameraEnabled(false);
                setMicEnabled(false);
            }
        } else {
            await startCamera(selectedVideoDeviceId, selectedAudioDeviceId);
        }
    };

    const switchCamera = async (deviceId) => {
        setSelectedVideoDeviceId(deviceId);
        if (cameraEnabled) await startCamera(deviceId, selectedAudioDeviceId);
    };

    const switchMic = async (deviceId) => {
        setSelectedAudioDeviceId(deviceId);
        if (cameraEnabled) await startCamera(selectedVideoDeviceId, deviceId);
    };

    const flipCamera = async () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacing);
        setSelectedVideoDeviceId('');
        if (cameraEnabled) await startCamera('', selectedAudioDeviceId, newFacing);
    };

    const toggleMic = () => {
        if (mediaStream) {
            const audioTracks = mediaStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setMicEnabled(!micEnabled);
        }
    };

    const handleSaveInfo = async () => {
        setIsCreatingStream(true);
        try {
            const streamMode = streamMethod === 'webcam' ? 'browser' : 'software';
            const { data } = await api.post('/live/create', { title: title.trim() || '', description, streamMode, discordAnnounce });
            if (data.status) {
                setStreamData({
                    url: data.result.rtmpUrl,
                    key: data.result.streamKey,
                    whipUrl: data.result.whipEndpointUrl || ''
                });
                setLiveStreamId(data.result.id);
                setIsSaved(true);
                toast({ title: "Ready to Broadcast", description: "Stream key generated. You're ready to go live." });
            } else {
                toast({ title: 'Error', description: data.message || 'Failed to create stream.', variant: 'destructive' });
            }
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create stream.', variant: 'destructive' });
        } finally {
            setIsCreatingStream(false);
        }
    };

    const handleUpdateInfo = async () => {
        if (!liveStreamId) return;
        setIsCreatingStream(true);
        try {
            await api.patch(`/live/${liveStreamId}`, { title: title.trim() || '', description });
            toast({ title: 'Stream updated', description: 'Title and description saved.' });
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to update stream.', variant: 'destructive' });
        } finally {
            setIsCreatingStream(false);
        }
    };

    // ── Browser streaming: MediaRecorder → WebSocket → ffmpeg → Mux RTMP ──
    // Bypasses all WHIP/WebRTC issues. Server pipes webm chunks to Mux via RTMP.
    const startBrowserStream = async (stream, streamId = liveStreamId) => {
        if (!streamId) {
            toast({ title: 'Stream not initialized.', variant: 'destructive' });
            return false;
        }
        try {
            // Get a short-lived broadcast token from the backend (avoids passing full JWT in WS URL)
            const tokenResp = await api.get(`/live/${streamId}/broadcast-token`);
            const bcastToken = tokenResp.data?.result?.token;
            if (!bcastToken) throw new Error('Failed to get broadcast token');

            const wsUrl = `${import.meta.env.VITE_WS_URL || 'wss://backend.thehomies.app'}/ws/broadcast?bcast=${bcastToken}`;

            // Connect WebSocket
            await new Promise((resolve, reject) => {
                const ws = new WebSocket(wsUrl);
                ws.binaryType = 'arraybuffer';
                const timeout = setTimeout(() => { ws.close(); reject(new Error('Broadcast connection timed out')); }, 10000);
                ws.onopen = () => console.log('[broadcast] WS connected');
                ws.onmessage = (e) => {
                    try {
                        const msg = JSON.parse(e.data);
                        if (msg.type === 'ready') { clearTimeout(timeout); resolve(ws); }
                    } catch (_) {}
                };
                ws.onerror = () => { clearTimeout(timeout); reject(new Error('Broadcast connection failed')); };
                ws.onclose = (e) => { if (e.code !== 1000) clearTimeout(timeout); };
            }).then(ws => { broadcastWsRef.current = ws; });

            // Pick best supported codec
            const mimeType = ['video/webm;codecs=h264,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
                .find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data?.size > 0 && broadcastWsRef.current?.readyState === WebSocket.OPEN) {
                    e.data.arrayBuffer().then(buf => broadcastWsRef.current?.send(buf));
                }
            };

            recorder.start(500); // send a chunk every 500ms
            return true;
        } catch (err) {
            console.error('[broadcast] failed:', err);
            toast({ title: 'Stream Connection Failed', description: err.message || 'Connection failed', variant: 'destructive' });
            broadcastWsRef.current?.close();
            broadcastWsRef.current = null;
            return false;
        }
    };

    const handleGoLive = async () => {
        setIsGoingLive(true);

        try {
            // Auto-save if not yet saved (webcam mode one-click flow)
            let streamId = liveStreamId;
            if (!isSaved) {
                const streamMode = streamMethod === 'webcam' ? 'browser' : 'software';
                const { data } = await api.post('/live/create', { title: title.trim() || '', description, streamMode, discordAnnounce });
                if (!data.status) {
                    toast({ title: 'Error', description: data.message || 'Failed to create stream.', variant: 'destructive' });
                    setIsGoingLive(false);
                    return;
                }
                streamId = data.result.id;
                setStreamData({ url: data.result.rtmpUrl, key: data.result.streamKey, whipUrl: data.result.whipEndpointUrl || '' });
                setLiveStreamId(streamId);
                setIsSaved(true);
            }

            // For webcam mode, start MediaRecorder → WebSocket → ffmpeg pipeline
            if (streamMethod === 'webcam') {
                let streamToUse = mediaStream;
                if (!cameraEnabled || !mediaStream) {
                    // No camera — request audio-only so the stream still goes live
                    try {
                        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                        setMediaStream(audioOnly);
                        setMicEnabled(true);
                        streamToUse = audioOnly;
                    } catch (_) {
                        streamToUse = null;
                    }
                    setUsingFallback(true);
                }
                if (!streamToUse) {
                    toast({ title: 'Microphone required', description: 'Could not access your mic. Check browser permissions and try again.', variant: 'destructive' });
                    setIsGoingLive(false);
                    return;
                }
                const ok = await startBrowserStream(streamToUse, streamId);
                if (!ok) { setIsGoingLive(false); return; }
            }

            // Tell the backend we're live → triggers follower email notifications
            if (streamId) {
                await api.post(`/live/${streamId}/go-live`);
            }

            setIsLive(true);
            toast({ title: "🔴 You are Live!", description: "Broadcasting started successfully.", className: "bg-red-600 text-white border-none" });
        } catch (err) {
            toast({ title: 'Failed to go live', description: err.message || 'Something went wrong. Try again.', variant: 'destructive' });
        } finally {
            setIsGoingLive(false);
        }
    };

    const handleEndStream = async () => {
        setIsLive(false);
        setUsingFallback(false);
        setDonationBotEnabled(false);
        if (donationBotRef.current) { clearInterval(donationBotRef.current); donationBotRef.current = null; }
        // Stop browser stream (MediaRecorder + WebSocket)
        if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop(); } catch (_) {} mediaRecorderRef.current = null; }
        if (broadcastWsRef.current) { broadcastWsRef.current.close(); broadcastWsRef.current = null; }
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        stopMediaTracks();
        setCameraEnabled(false);
        setMicEnabled(false);
        setMediaStream(null);
        if (liveStreamId) {
            try { await api.delete(`/live/${liveStreamId}`); } catch (_) {}
            setLiveStreamId(null);
        }
        setStreamData({ url: '', key: '', whipUrl: '' });
        setIsSaved(false);
        toast({ title: "Stream Ended", description: "Your broadcast has finished." });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard!" });
    };

    return (
        <TooltipProvider>
            <Helmet>
                <title>Go Live Studio - The Homies Hub</title>
            </Helmet>

            <div className="min-h-screen bg-background text-foreground flex flex-col">
                {/* Header */}
                <header className="h-16 border-b flex items-center justify-between px-4 md:px-8 bg-card/50 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <BackButton />
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Radio className={cn("h-5 w-5", isLive ? "text-red-500 animate-pulse" : "text-muted-foreground")} />
                            {isLive ? <span className="text-red-500 tracking-wide">ON AIR</span> : "Creator Studio"}
                        </h1>
                    </div>
                    {isLive && (
                        <Button variant="destructive" onClick={handleEndStream} className="font-bold shadow-red-500/20 shadow-lg">
                            End Stream
                        </Button>
                    )}
                </header>

                <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    
                    {/* LEFT PANEL: MAIN STAGE */}
                    <div className="flex-1 bg-zinc-950 relative flex flex-col min-h-[50vh] lg:min-h-full overflow-y-auto lg:overflow-hidden">
                        
                        {/* Stream Method Tabs */}
                        {!isLive && (
                            <div className="w-full max-w-4xl mx-auto p-4 flex justify-center">
                                <div className="bg-zinc-900/80 p-1 rounded-xl border border-white/5 flex gap-1 shadow-2xl backdrop-blur-sm">
                                    <button
                                        onClick={() => setStreamMethod('webcam')}
                                        className={cn(
                                            "px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                                            streamMethod === 'webcam' 
                                                ? "bg-primary text-primary-foreground shadow-lg scale-100" 
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <MonitorPlay className="h-4 w-4" /> 
                                        <span>Direct Webcam</span>
                                    </button>
                                    <button
                                        onClick={() => setStreamMethod('software')}
                                        className={cn(
                                            "px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                                            streamMethod === 'software' 
                                                ? "bg-primary text-primary-foreground shadow-lg scale-100" 
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <Laptop className="h-4 w-4" /> 
                                        <span>Streaming Software</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STAGE AREA */}
                        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6 overflow-hidden relative">
                            
                            {/* METHOD: WEBCAM */}
                            {streamMethod === 'webcam' && (
                                <div className="w-full max-w-5xl space-y-4">
                                    {/* Video Container */}
                                    <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group ring-1 ring-white/5">
                                        {/* Status Indicators */}
                                        <div className="absolute top-4 right-4 z-20 flex gap-2">
                                            {isLive && (
                                                <Badge variant="destructive" className="animate-pulse shadow-lg">LIVE</Badge>
                                            )}
                                            {cameraEnabled && (
                                                 <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-md border-white/10">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2" /> 720p
                                                 </Badge>
                                            )}
                                        </div>

                                        {/* Main Video Feed */}
                                        {cameraEnabled ? (
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                muted
                                                playsInline
                                                className={cn("w-full h-full object-cover", facingMode === 'user' && "scale-x-[-1]")}
                                            />
                                        ) : (
                                            /* Offline / Fallback State */
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50 backdrop-blur-sm p-6">
                                                {usingFallback || isLive ? (
                                                    <div className="text-center animate-pulse">
                                                        <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-zinc-700">
                                                            <Mic className="h-10 w-10 text-primary" />
                                                        </div>
                                                        <h3 className="text-xl font-bold text-white">Audio-Only Stream</h3>
                                                        <p className="text-zinc-400">Your camera is off, but viewers can still hear you.</p>
                                                    </div>
                                                ) : permissionError ? (
                                                    <div className="text-center p-6 bg-red-500/10 rounded-xl border border-red-500/20 max-w-md">
                                                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                                                        <p className="text-red-400 font-medium mb-2">Camera Access Denied</p>
                                                        <p className="text-sm text-red-400/80 mb-4">{permissionError}</p>
                                                        <div className="flex gap-2 justify-center">
                                                            <Button variant="outline" size="sm" onClick={toggleCamera}>Retry Access</Button>
                                                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => setPermissionError(null)}>Dismiss</Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <VideoOff className="h-8 w-8 opacity-50" />
                                                        </div>
                                                        <p className="text-lg font-medium text-zinc-300">Camera is currently off</p>
                                                        <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                                                            Enable your camera to start previewing your stream setup. 
                                                            You can also go live with just audio.
                                                        </p>
                                                        <Button onClick={toggleCamera} size="lg" className="gap-2 text-base px-8">
                                                            <Video className="h-5 w-5" /> Enable Camera & Mic
                                                        </Button>
                                                        <p className="text-xs text-zinc-500 mt-2">Browser will ask for permission</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Bottom Controls Overlay — hide on mobile when camera is off and not live */}
                                        {(cameraEnabled || usingFallback || isLive) && (
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-between transition-opacity duration-300">
                                            <div className="flex items-center gap-3">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant={cameraEnabled ? "secondary" : "destructive"}
                                                            size="icon"
                                                            onClick={toggleCamera}
                                                            className="rounded-full h-12 w-12 shadow-lg ring-2 ring-black/20"
                                                        >
                                                            {cameraEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>{cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant={micEnabled ? "secondary" : "destructive"}
                                                            size="icon"
                                                            onClick={toggleMic}
                                                            className="rounded-full h-12 w-12 shadow-lg ring-2 ring-black/20"
                                                            disabled={!cameraEnabled && !usingFallback}
                                                        >
                                                            {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>{micEnabled ? "Mute Microphone" : "Unmute Microphone"}</p>
                                                    </TooltipContent>
                                                </Tooltip>

                                                {/* Flip Camera — shown when multiple cameras available */}
                                                {cameraEnabled && videoDevices.length > 1 && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="secondary"
                                                                size="icon"
                                                                onClick={flipCamera}
                                                                className="rounded-full h-12 w-12 shadow-lg ring-2 ring-black/20"
                                                            >
                                                                <RotateCcw className="h-5 w-5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>Flip Camera ({facingMode === 'user' ? 'Switch to Rear' : 'Switch to Front'})</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}

                                                {/* Audio Visualizer */}
                                                {(micEnabled && (cameraEnabled || usingFallback)) && (
                                                    <div className="hidden sm:flex h-12 px-4 bg-black/40 rounded-full items-center border border-white/10 backdrop-blur-md ml-2">
                                                        <AudioLevelIndicator stream={mediaStream} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* GO LIVE — desktop overlay only */}
                                            {!isLive && (
                                                <div className="hidden sm:flex flex-col items-end gap-2">
                                                    <Button
                                                        size="lg"
                                                        onClick={handleGoLive}
                                                        disabled={isGoingLive}
                                                        className="font-bold text-lg shadow-xl min-w-[160px] bg-[#FE2C55] hover:bg-[#FE2C55]/90"
                                                    >
                                                        {isGoingLive ? <Loader2 className="h-5 w-5 animate-spin" /> : 'GO LIVE'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                        )}
                                    </div>

                                    {/* Mobile GO LIVE button — full width below video, only on small screens */}
                                    {!isLive && (
                                        <Button
                                            size="lg"
                                            onClick={handleGoLive}
                                            disabled={isGoingLive}
                                            className="sm:hidden w-full h-14 font-bold text-xl shadow-xl bg-[#FE2C55] hover:bg-[#FE2C55]/90"
                                        >
                                            {isGoingLive ? <Loader2 className="h-6 w-6 animate-spin" /> : '🔴 GO LIVE'}
                                        </Button>
                                    )}

                                    {/* Collapsible device settings */}
                                    {cameraEnabled && (videoDevices.length > 0 || audioDevices.length > 0) && (
                                        <div className="rounded-xl border border-white/10 bg-zinc-900/60 overflow-hidden">
                                            <button
                                                onClick={() => setShowDeviceSettings(v => !v)}
                                                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Settings className="h-3.5 w-3.5" />
                                                    Camera &amp; Mic Settings
                                                </span>
                                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showDeviceSettings && "rotate-180")} />
                                            </button>
                                            {showDeviceSettings && (
                                                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
                                                    {videoDevices.length > 0 && (
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-zinc-500 font-medium">Camera</label>
                                                            <select
                                                                value={selectedVideoDeviceId}
                                                                onChange={(e) => switchCamera(e.target.value)}
                                                                className="w-full h-9 text-xs bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2"
                                                            >
                                                                {videoDevices.map((d, i) => (
                                                                    <option key={d.deviceId} value={d.deviceId}>
                                                                        {d.label || `Camera ${i + 1}`}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                    {audioDevices.length > 0 && (
                                                        <div className="space-y-1">
                                                            <label className="text-xs text-zinc-500 font-medium">Microphone</label>
                                                            <select
                                                                value={selectedAudioDeviceId}
                                                                onChange={(e) => switchMic(e.target.value)}
                                                                className="w-full h-9 text-xs bg-zinc-800 border border-zinc-700 text-white rounded-lg px-2"
                                                            >
                                                                {audioDevices.map((d, i) => (
                                                                    <option key={d.deviceId} value={d.deviceId}>
                                                                        {d.label || `Mic ${i + 1}`}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Educational Note - Webcam */}
                                    <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-500 px-2">
                                        <div className="flex items-start gap-2">
                                            <Wifi className="h-4 w-4 mt-0.5 text-blue-500" />
                                            <p>Requires a stable internet connection (min 5Mbps upload recommended).</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <ShieldCheck className="h-4 w-4 mt-0.5 text-green-500" />
                                            <p>Your browser manages permissions securely. No software install needed.</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Globe className="h-4 w-4 mt-0.5 text-purple-500" />
                                            <p>Broadcasts directly to all Homies Hub platforms instantly.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* METHOD: SOFTWARE (OBS) */}
                            {streamMethod === 'software' && (
                                <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-300">

                                    {/* Live status indicator */}
                                    <div className={cn(
                                        "flex items-center justify-center gap-3 py-3 px-6 rounded-xl border text-sm font-medium transition-all",
                                        softwareStreamStatus === 'active'
                                            ? "bg-red-600/20 border-red-500/40 text-red-400"
                                            : isSaved
                                                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                                                : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
                                    )}>
                                        <span className={cn("h-2.5 w-2.5 rounded-full", softwareStreamStatus === 'active' ? "bg-red-500 animate-pulse" : isSaved ? "bg-yellow-500 animate-pulse" : "bg-zinc-600")} />
                                        {softwareStreamStatus === 'active'
                                            ? "🔴 Connected — You're Live"
                                            : isSaved
                                                ? "Waiting for Restream/OBS to connect..."
                                                : "Save stream info to get your RTMP key"}
                                    </div>

                                    {/* Live preview — shows your own stream once Restream connects */}
                                    {softwareStreamStatus === 'active' && softwarePlaybackId && (
                                        <div className="aspect-video rounded-xl overflow-hidden border border-red-500/30 shadow-2xl shadow-red-900/20">
                                            <MuxPlayer
                                                streamType="ll-live"
                                                playbackId={softwarePlaybackId}
                                                autoPlay
                                                muted
                                                style={{ width: '100%', height: '100%' }}
                                            />
                                        </div>
                                    )}

                                    <div className="text-center space-y-4">
                                        <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-white/10">
                                            <Laptop className="h-10 w-10 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-bold text-white mb-2">Advanced Streaming Setup</h2>
                                            <p className="text-zinc-400 max-w-lg mx-auto">
                                                Use professional software like OBS Studio, Streamlabs, or Restream to broadcast high-quality content with overlays and multiple scenes.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Settings className="h-5 w-5 text-primary" />
                                                    Stream Configuration
                                                </CardTitle>
                                                <CardDescription className="text-zinc-400">
                                                    Enter these details into your streaming software's settings.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Server URL</Label>
                                                        <Tooltip>
                                                            <TooltipTrigger><Info className="h-3 w-3 text-zinc-500" /></TooltipTrigger>
                                                            <TooltipContent>The RTMP ingest server address.</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input readOnly value={streamData.url} placeholder="Save your stream to get RTMP URL" className="bg-black/40 border-zinc-700 font-mono text-sm h-11" />
                                                        <Button size="icon" variant="secondary" onClick={() => copyToClipboard(streamData.url)} disabled={!streamData.url}>
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Stream Key</Label>
                                                        <button 
                                                            onClick={() => setShowStreamKey(!showStreamKey)} 
                                                            className="text-xs text-primary hover:underline font-medium"
                                                        >
                                                            {showStreamKey ? "Hide" : "Show"}
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type={showStreamKey ? "text" : "password"}
                                                            readOnly
                                                            value={streamData.key}
                                                            placeholder="Save your stream to get stream key"
                                                            className="bg-black/40 border-zinc-700 font-mono text-sm h-11"
                                                        />
                                                        <Button size="icon" variant="secondary" onClick={() => copyToClipboard(streamData.key)} disabled={!streamData.key}>
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-start gap-2 mt-2 p-3 bg-red-900/20 rounded-md border border-red-900/30">
                                                        <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                                                        <p className="text-xs text-red-300">
                                                            <strong>Security Warning:</strong> Never share your stream key. Anyone with this key can stream to your channel.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="space-y-6">
                                            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                                                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                                    <HelpCircle className="h-4 w-4 text-primary" /> 
                                                    How to Connect
                                                </h3>
                                                <ol className="space-y-4 text-sm text-zinc-400 list-decimal list-inside">
                                                    <li>Open <span className="text-white font-medium">OBS Studio</span> or your preferred software.</li>
                                                    <li>Go to <span className="text-white font-medium">Settings &gt; Stream</span>.</li>
                                                    <li>Select <span className="text-white font-medium">Custom Service</span>.</li>
                                                    <li>Paste the <span className="text-white font-medium">Server URL</span> and <span className="text-white font-medium">Stream Key</span> provided here.</li>
                                                    <li>Click <span className="text-white font-medium">Start Streaming</span> in OBS.</li>
                                                </ol>
                                            </div>
                                            
                                            <Alert className="bg-blue-950/30 border-blue-900/50">
                                                <Info className="h-4 w-4 text-blue-400" />
                                                <AlertTitle className="text-blue-400">Powered by Mux</AlertTitle>
                                                <AlertDescription className="text-blue-300/80 text-xs mt-1">
                                                    Your stream key is generated via Mux Live Streams. The RTMP ingest URL and stream key update each time you save a new stream.
                                                </AlertDescription>
                                            </Alert>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: SIDEBAR */}
                    <div className="w-full lg:w-[400px] bg-card border-l flex flex-col h-[50vh] lg:h-auto border-t lg:border-t-0 shadow-xl z-10">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                            <TabsList className="grid w-full grid-cols-3 rounded-none h-14 border-b bg-background p-0">
                                <TabsTrigger
                                    value="setup"
                                    className="rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-muted/50 transition-colors"
                                >
                                    Stream Setup
                                </TabsTrigger>
                                <TabsTrigger
                                    value="chat"
                                    className="rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-muted/50 transition-colors"
                                >
                                    Live Chat
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-muted/50 transition-colors"
                                >
                                    History
                                </TabsTrigger>
                            </TabsList>

                            {/* SETUP TAB */}
                            <TabsContent value="setup" className="flex-1 p-6 overflow-y-auto space-y-6">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg">Broadcast Details</h3>
                                    <p className="text-sm text-muted-foreground">Tell your audience what this stream is about.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label htmlFor="title">Title <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                            <span className="text-xs text-muted-foreground">{title.length}/100</span>
                                        </div>
                                        <Input 
                                            id="title" 
                                            placeholder="Ex: Late Night Chill & Chat 🌙" 
                                            value={title}
                                            maxLength={100}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="font-medium"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label htmlFor="desc">Description</Label>
                                            <Tooltip>
                                                <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                                                <TooltipContent>Visible in notifications and search</TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Textarea 
                                            id="desc" 
                                            placeholder="What topic are you covering? Mention special guests or key points." 
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            className="resize-none h-32" 
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Notify Followers</Label>
                                            <p className="text-xs text-muted-foreground">Send a push notification when live</p>
                                        </div>
                                        <Switch
                                            checked={notifyFollowers}
                                            onCheckedChange={setNotifyFollowers}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border">
                                        <div className="space-y-0.5">
                                            <Label className="text-base flex items-center gap-2">
                                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#5865F2' }}><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                                                Discord Announcement
                                            </Label>
                                            <p className="text-xs text-muted-foreground">Ping @everyone in the Discord lounge</p>
                                        </div>
                                        <Switch
                                            checked={discordAnnounce}
                                            onCheckedChange={setDiscordAnnounce}
                                            disabled={isSaved}
                                        />
                                    </div>
                                </div>

                                {/* Admin Panel — visible only to forthehomies96@gmail.com */}
                                {isAdmin && (
                                    <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-4">
                                        <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                                            <ShieldCheck className="h-3.5 w-3.5" /> Admin Controls
                                        </p>

                                        {/* Donation Bot Toggle */}
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm">Donation Bot</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Posts donation prompts every 5 min{donationBotEnabled && isLive ? ' · Active' : ''}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={donationBotEnabled}
                                                onCheckedChange={setDonationBotEnabled}
                                            />
                                        </div>
                                        {donationBotEnabled && !isLive && (
                                            <p className="text-xs text-yellow-400/70">Will start posting when you go live.</p>
                                        )}

                                        {/* Viewer Count Boost */}
                                        <div className="space-y-2">
                                            <Label className="text-sm">Viewer Count Boost</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Add to displayed viewer count{viewerBoostApplied > 0 ? ` · Currently +${viewerBoostApplied}` : ''}
                                            </p>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={viewerBoostInput}
                                                    onChange={(e) => setViewerBoostInput(e.target.value)}
                                                    className="h-9 text-sm bg-background"
                                                    placeholder="0"
                                                    disabled={!liveStreamId}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={applyViewerBoost}
                                                    disabled={!liveStreamId}
                                                    className="shrink-0"
                                                >
                                                    Apply
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 mt-auto">
                                    <Button
                                        onClick={isSaved ? handleUpdateInfo : handleSaveInfo}
                                        className="w-full h-12 text-lg font-semibold"
                                        size="lg"
                                        disabled={isCreatingStream}
                                    >
                                        {isCreatingStream
                                            ? <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> {isSaved ? 'Updating...' : 'Creating Stream...'}</span>
                                            : isSaved
                                                ? <span className="flex items-center gap-2"><Save className="h-5 w-5" /> Update Info</span>
                                                : "Save Stream Info"
                                        }
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground mt-4">
                                        Title is optional — defaults to "@username is live"
                                    </p>
                                </div>
                            </TabsContent>

                            {/* CHAT TAB */}
                            <TabsContent value="chat" className="flex-1 flex flex-col h-full m-0 p-0 overflow-hidden">
                                {liveStreamId ? (
                                    <LiveChat
                                        streamId={String(liveStreamId)}
                                        isCollapsible={false}
                                        className="h-full"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center bg-muted/10">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                            <MessageSquare className="h-8 w-8 opacity-40" />
                                        </div>
                                        <h3 className="font-semibold text-lg mb-2">Chat is Offline</h3>
                                        <p className="text-sm max-w-[200px]">Save your stream info first to enable chat.</p>
                                    </div>
                                )}
                            </TabsContent>

                            {/* HISTORY TAB */}
                            <TabsContent value="history" className="flex-1 overflow-y-auto p-4 space-y-3">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : liveHistory.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                                        <Clock className="h-10 w-10 mb-3 opacity-30" />
                                        <p className="font-medium">No streams yet</p>
                                        <p className="text-xs mt-1">Your past broadcasts will appear here.</p>
                                    </div>
                                ) : (
                                    liveHistory.map((s) => (
                                        <div key={s.id} className="rounded-lg border bg-muted/20 overflow-hidden">
                                            {/* VOD thumbnail / player preview */}
                                            {s.vodPlaybackId && (
                                                <div className="aspect-video bg-black">
                                                    <MuxPlayer
                                                        playbackId={s.vodPlaybackId}
                                                        streamType="on-demand"
                                                        style={{ width: '100%', height: '100%' }}
                                                        thumbnailTime={2}
                                                    />
                                                </div>
                                            )}
                                            {!s.vodPlaybackId && s.thumbnailUrl && (
                                                <img src={s.thumbnailUrl} alt={s.title} className="w-full aspect-video object-cover" />
                                            )}
                                            <div className="p-3 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium text-sm leading-snug line-clamp-2">{s.title}</p>
                                                    {s.status === 'active' ? (
                                                        <span className="shrink-0 text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-medium animate-pulse">LIVE</span>
                                                    ) : s.status === 'idle' ? (
                                                        <span className="shrink-0 text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-medium">IDLE</span>
                                                    ) : s.vodPlaybackId ? (
                                                        <span className="shrink-0 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-medium">VOD</span>
                                                    ) : (
                                                        <span className="shrink-0 text-xs bg-muted text-muted-foreground border px-1.5 py-0.5 rounded">Ended</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>{new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                    <span className="capitalize">{s.streamMode}</span>
                                                </div>
                                                {(s.status === 'active' || s.status === 'idle') && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full h-8 text-xs"
                                                        onClick={() => {
                                                            setStreamData({ url: 'rtmps://global-live.mux.com:443/app', key: s.streamKey || streamData.key, whipUrl: '' });
                                                            setLiveStreamId(s.id);
                                                            setIsSaved(true);
                                                            setTitle(s.title);
                                                            setDescription(s.description || '');
                                                            if (s.streamMode === 'software') setStreamMethod('software');
                                                            setActiveTab('setup');
                                                            toast({ title: 'Stream resumed', description: 'Ready to go live.' });
                                                        }}
                                                    >
                                                        Resume Stream
                                                    </Button>
                                                )}
                                                {s.vodPlaybackId && (
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="w-full h-8 text-xs"
                                                        onClick={async () => {
                                                            if (!window.confirm('Delete this VOD? This cannot be undone.')) return;
                                                            try {
                                                                await api.delete(`/live/${s.id}/vod`);
                                                                setLiveHistory(prev => prev.map(x => x.id === s.id ? { ...x, vodPlaybackId: null, vodAssetId: null } : x));
                                                                toast({ title: 'VOD deleted.' });
                                                            } catch {
                                                                toast({ title: 'Error', description: 'Failed to delete VOD.', variant: 'destructive' });
                                                            }
                                                        }}
                                                    >
                                                        Delete VOD
                                                    </Button>
                                                )}
                                                {s.status === 'disabled' && !s.vodPlaybackId && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="w-full h-8 text-xs text-muted-foreground"
                                                        onClick={() => { setTitle(s.title); setDescription(s.description || ''); setActiveTab('setup'); }}
                                                    >
                                                        Reuse Title
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                </main>
            </div>
        </TooltipProvider>
    );
};

export default GoLivePage;
