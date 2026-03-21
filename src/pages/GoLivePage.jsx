
import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Video, Mic, MicOff, Video as VideoIcon, VideoOff,
  MessageSquare, Radio, Share2, Copy, Check, Save,
  MonitorPlay, Laptop, AlertCircle, Signal, Info, HelpCircle,
  Wifi, ShieldCheck, Globe, Loader2, ChevronDown
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

    // Webcam State
    const videoRef = useRef(null);
    const pcRef = useRef(null); // WebRTC peer connection for WHIP
    const [mediaStream, setMediaStream] = useState(null);
    const [cameraEnabled, setCameraEnabled] = useState(false);
    const [micEnabled, setMicEnabled] = useState(false);
    const [permissionError, setPermissionError] = useState(null);
    const [usingFallback, setUsingFallback] = useState(false);
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [activeTab, setActiveTab] = useState('setup');

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [notifyFollowers, setNotifyFollowers] = useState(true);

    // Attach stream to video element whenever mediaStream changes
    useEffect(() => {
        if (videoRef.current && mediaStream) {
            videoRef.current.srcObject = mediaStream;
        }
    }, [mediaStream]);

    // Auto-switch to chat tab when going live
    useEffect(() => {
        if (isLive) setActiveTab('chat');
    }, [isLive]);

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
            setVideoDevices(cams);
            if (cams.length > 0 && !selectedDeviceId) {
                setSelectedDeviceId(cams[0].deviceId);
            }
        } catch (_) {}
    };

    const toggleCamera = async () => {
        setPermissionError(null);
        setUsingFallback(false);

        if (cameraEnabled) {
            stopMediaTracks();
            setCameraEnabled(false);
            setMicEnabled(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: selectedDeviceId
                    ? { deviceId: { exact: selectedDeviceId }, width: 1280, height: 720 }
                    : { width: 1280, height: 720 },
                audio: true
            });

            setMediaStream(stream);
            setCameraEnabled(true);
            setMicEnabled(true);
            // Enumerate after first permission grant so labels are available
            await enumerateDevices();
        } catch (err) {
            console.error("Media Error:", err);
            setPermissionError("We couldn't access your camera or microphone.");
        }
    };

    // Switch camera device without stopping the stream
    const switchCamera = async (deviceId) => {
        setSelectedDeviceId(deviceId);
        if (!cameraEnabled) return;
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
                audio: true,
            });
            if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
            setMediaStream(newStream);
            setMicEnabled(true);
        } catch (err) {
            toast({ title: 'Camera switch failed', description: err.message, variant: 'destructive' });
        }
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
        if (!title.trim()) {
            toast({ title: "Title Required", description: "Please enter a stream title.", variant: "destructive" });
            return;
        }
        setIsCreatingStream(true);
        try {
            const streamMode = streamMethod === 'webcam' ? 'browser' : 'software';
            const { data } = await api.post('/live/create', { title: title.trim(), description, streamMode });
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

    // ── WHIP WebRTC: sends browser MediaStream directly to Mux ──
    const startWhipStream = async (stream) => {
        if (!streamData.whipUrl) {
            toast({ title: 'No WHIP URL', description: 'Save stream info first.', variant: 'destructive' });
            return false;
        }
        try {
            const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global-turn.mux.com:3478' },
            ]
        });
            pcRef.current = pc;

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Wait for ICE gathering to complete
            await new Promise((resolve) => {
                if (pc.iceGatheringState === 'complete') { resolve(); return; }
                const check = () => {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', check);
                        resolve();
                    }
                };
                pc.addEventListener('icegatheringstatechange', check);
                setTimeout(resolve, 3000); // fallback timeout
            });

            const resp = await fetch(streamData.whipUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription.sdp,
            });

            if (!resp.ok) throw new Error(`WHIP error ${resp.status}`);

            const answerSdp = await resp.text();
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
            return true;
        } catch (err) {
            console.error('WHIP failed:', err);
            toast({ title: 'Stream Connection Failed', description: err.message, variant: 'destructive' });
            if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
            return false;
        }
    };

    const handleGoLive = async () => {
        if (!isSaved) return;
        setIsGoingLive(true);

        try {
            // For webcam mode, establish WHIP WebRTC connection first
            if (streamMethod === 'webcam') {
                if (!cameraEnabled && !mediaStream) {
                    setUsingFallback(true);
                } else if (mediaStream) {
                    const ok = await startWhipStream(mediaStream);
                    if (!ok) { setIsGoingLive(false); return; }
                }
            }

            // Tell the backend we're live → triggers follower email notifications
            if (liveStreamId) {
                await api.post(`/live/${liveStreamId}/go-live`);
            }

            setIsLive(true);
            toast({ title: "🔴 You are Live!", description: "Broadcasting started successfully.", className: "bg-red-600 text-white border-none" });
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to go live.', variant: 'destructive' });
        } finally {
            setIsGoingLive(false);
        }
    };

    const handleEndStream = async () => {
        setIsLive(false);
        setUsingFallback(false);
        // Close WHIP peer connection
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
                                                className="w-full h-full object-cover transform scale-x-[-1]" 
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
                                                        <Button onClick={toggleCamera} className="gap-2" variant="secondary">
                                                            <Video className="h-4 w-4" /> Enable Camera & Mic
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Camera selector */}
                                        {videoDevices.length > 1 && (
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                                                <Select value={selectedDeviceId} onValueChange={switchCamera}>
                                                    <SelectTrigger className="h-8 text-xs bg-black/60 border-white/20 text-white backdrop-blur-sm w-48">
                                                        <SelectValue placeholder="Select camera" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {videoDevices.map(d => (
                                                            <SelectItem key={d.deviceId} value={d.deviceId}>
                                                                {d.label || `Camera ${videoDevices.indexOf(d) + 1}`}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        {/* Bottom Controls Overlay */}
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

                                                {/* Audio Visualizer */}
                                                {(micEnabled && (cameraEnabled || usingFallback)) && (
                                                    <div className="h-12 px-4 bg-black/40 rounded-full flex items-center border border-white/10 backdrop-blur-md ml-2">
                                                        <AudioLevelIndicator stream={mediaStream} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            {!isLive && (
                                                <div className="flex flex-col items-end gap-2">
                                                    {!isSaved && (
                                                        <span className="text-xs text-yellow-500 font-medium bg-black/60 px-2 py-1 rounded backdrop-blur-md">
                                                            Save Info to Go Live
                                                        </span>
                                                    )}
                                                    <Button
                                                        size="lg"
                                                        onClick={handleGoLive}
                                                        disabled={!isSaved || isGoingLive}
                                                        className={cn(
                                                            "font-bold text-lg shadow-xl min-w-[160px]",
                                                            isSaved
                                                                ? "bg-[#FE2C55] hover:bg-[#FE2C55]/90"
                                                                : "bg-zinc-700 text-zinc-400"
                                                        )}
                                                    >
                                                        {isGoingLive ? <Loader2 className="h-5 w-5 animate-spin" /> : 'GO LIVE'}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Educational Note - Webcam */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-500 px-2">
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
                                                        <Input readOnly value={streamData.url} className="bg-black/40 border-zinc-700 font-mono text-sm h-11" />
                                                        <Button size="icon" variant="secondary" onClick={() => copyToClipboard(streamData.url)}>
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
                                                            className="bg-black/40 border-zinc-700 font-mono text-sm h-11" 
                                                        />
                                                        <Button size="icon" variant="secondary" onClick={() => copyToClipboard(streamData.key)}>
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
                            <TabsList className="grid w-full grid-cols-2 rounded-none h-14 border-b bg-background p-0">
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
                                            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
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
                                </div>

                                <div className="pt-4 mt-auto">
                                    <Button onClick={handleSaveInfo} className="w-full h-12 text-lg font-semibold" size="lg" disabled={isSaved || isCreatingStream}>
                                        {isCreatingStream ? <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Creating Stream...</span> : isSaved ? <span className="flex items-center gap-2"><Check className="h-5 w-5" /> Saved</span> : "Save Stream Info"}
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground mt-4">
                                        You must save your stream info before the <br/> "Go Live" button becomes active.
                                    </p>
                                </div>
                            </TabsContent>

                            {/* CHAT TAB */}
                            <TabsContent value="chat" className="flex-1 flex flex-col h-full m-0 p-0 overflow-hidden">
                                {isLive && liveStreamId ? (
                                    <LiveChat
                                        streamId={liveStreamId}
                                        isCollapsible={false}
                                        className="h-full"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center bg-muted/10">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                            <MessageSquare className="h-8 w-8 opacity-40" />
                                        </div>
                                        <h3 className="font-semibold text-lg mb-2">Chat is Offline</h3>
                                        <p className="text-sm max-w-[200px]">Chat will appear here once you go live.</p>
                                    </div>
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
