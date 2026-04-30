import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Video, MessageSquare, BarChart2, MapPin, Image as ImageIcon, PlusCircle, Trash2,
    ArrowLeft, Radio, Film, Upload, UploadCloud, X, Hash, Loader2, FileVideo, ZoomIn, Calendar,
    Clock, DollarSign, Coins, ShieldAlert, Crown, Info, Camera, Aperture, Database,
    Map, Mic, AlertCircle, RefreshCw, StopCircle, Disc, Monitor, Music, Play, Pause,
    Check, Plane, Users, Globe
} from 'lucide-react';
import UploadMomentModal from '@/components/UploadReelModal';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useContent } from '@/contexts/ContentContext';
import { useMedia } from '@/contexts/MediaContext';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

// ✅ Your API client (axios instance with baseURL + auth header interceptor - see src/lib/api.js)
import api from '@/api/homieshub';
// ✅ Direct upload to Mux must be a raw PUT to the returned URL


// ✅ Upload image to DigitalOcean Spaces via backend
const uploadImageToSpaces = async (file, folder) => {
    if (!file) return "";

    const form = new FormData();
    form.append("file", file);

    const resp = await api.post(`/files/upload?folder=${encodeURIComponent(folder)}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return resp?.data?.result?.url || "";
};

const PostTypeButton = ({ icon: Icon, label, onClick, active, special }) => (
    <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
            "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all duration-200 w-full aspect-square relative overflow-hidden",
            active ? "bg-primary/10 border-primary shadow-lg scale-105" : "bg-muted/50 hover:bg-muted border-border",
            special && "border-primary/50 bg-gradient-to-br from-zinc-900 to-black hover:border-primary shadow-glow-gold-sm"
        )}
    >
        {special && <div className="absolute top-0 right-0 p-1"><div className="w-2 h-2 bg-primary rounded-full animate-pulse" /></div>}
        <Icon className={cn("h-8 w-8", active ? "text-primary" : special ? "text-primary" : "text-muted-foreground")} />
        <span className={cn("font-semibold text-sm", active ? "text-primary" : special ? "text-white" : "text-foreground")}>{label}</span>
    </motion.button>
);

const NSFWConfirmationDialog = ({ isOpen, onOpenChange, onConfirm }) => {
    const [hasRead, setHasRead] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    const handleConfirm = () => {
        if (!isChecked) return;
        console.log(`[NSFW_CONFIRMATION_LOG] User confirmed NSFW rules at ${new Date().toISOString()}`);
        onConfirm();
        onOpenChange(false);
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 50) setHasRead(true);
    };

    useEffect(() => {
        if (!isOpen) {
            setIsChecked(false);
            setHasRead(false);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-destructive/50">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive mb-2 justify-center">
                        <ShieldAlert className="h-8 w-8" />
                    </div>
                    <DialogTitle className="text-center text-xl text-destructive">NSFW Content Verification</DialogTitle>
                    <DialogDescription className="text-center">
                        Please review our NSFW policy before proceeding.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[250px] w-full rounded-md border border-border p-4 bg-muted/20" onScrollCapture={handleScroll}>
                    <div className="space-y-4 text-sm text-foreground">
                        <p className="font-bold">By marking this content as NSFW, you acknowledge the following:</p>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-destructive">Strictly Prohibited:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>NO Child Sexual Abuse Material (CSAM).</strong> Zero tolerance. We report to authorities immediately.</li>
                                <li><strong>NO Non-consensual content.</strong> (e.g. "Revenge Porn", creepshots).</li>
                                <li><strong>NO Bestiality or Necrophilia.</strong></li>
                                <li><strong>NO Content promoting rape or sexual violence.</strong></li>
                            </ul>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-primary">Allowed with Tag:</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Consensual adult nudity and sexual activity.</li>
                                <li>Artistic nudity.</li>
                            </ul>
                        </div>

                        <p className="italic text-xs text-muted-foreground mt-4">
                            Scroll to the bottom to acknowledge.
                        </p>
                    </div>
                </ScrollArea>

                <div className="flex items-center space-x-2 mt-4 p-4 border border-border rounded-lg bg-card">
                    <Checkbox id="nsfw-agree" checked={isChecked} onCheckedChange={setIsChecked} disabled={!hasRead} />
                    <Label htmlFor="nsfw-agree" className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", !hasRead && "opacity-50")}>
                        I confirm this content complies with The Homies Hub NSFW rules.
                    </Label>
                </div>
                {!hasRead && <p className="text-[10px] text-center text-muted-foreground">Please read the rules above to enable confirmation.</p>}

                <DialogFooter className="sm:justify-between gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleConfirm} disabled={!isChecked}>
                        Confirm NSFW Status
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ContentSettings = ({ isNSFW, setIsNSFW, isSubscriberOnly, setIsSubscriberOnly, isMintable, setIsMintable }) => {
    const [showNSFWModal, setShowNSFWModal] = useState(false);

    const handleNSFWToggle = (checked) => {
        if (checked) setShowNSFWModal(true);
        else setIsNSFW(false);
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg border mt-4 relative z-20">
            <h4 className="font-semibold text-sm text-muted-foreground mb-1">Content Settings</h4>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    <div className="flex flex-col">
                        <Label htmlFor="nsfw-mode" className="cursor-pointer font-medium">NSFW Content</Label>
                    </div>
                </div>
                <Switch
                    id="nsfw-mode"
                    checked={isNSFW}
                    onCheckedChange={handleNSFWToggle}
                    className={cn("!data-[state=checked]:bg-red-500 !data-[state=unchecked]:bg-green-500 relative z-30 touch-none", isNSFW ? "data-[state=checked]:bg-green-500" : "data-[state=unchecked]:bg-red-500")}
                />
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <div className="flex flex-col">
                        <Label htmlFor="sub-only-mode" className="cursor-pointer font-medium">Subscriber Only</Label>
                    </div>
                </div>
                <Switch
                    id="sub-only-mode"
                    checked={isSubscriberOnly}
                    onCheckedChange={setIsSubscriberOnly}
                    className={cn("!data-[state=checked]:bg-red-500 !data-[state=unchecked]:bg-green-500 relative z-30 touch-none", isSubscriberOnly ? "data-[state=checked]:bg-green-500" : "data-[state=unchecked]:bg-red-500")}
                />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-dashed border-white/10 mt-1 relative">
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-400" />
                    <div className="flex flex-col">
                        <Label htmlFor="mint-mode" className="cursor-pointer font-medium text-blue-400">Mint This Post</Label>
                        <span className="text-[10px] text-muted-foreground">Create unverified collectible</span>
                    </div>
                </div>
                <div className="relative z-30 p-1">
                    <Switch
                        id="mint-mode"
                        checked={isMintable}
                        onCheckedChange={setIsMintable}
                        className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500 touch-none"
                    />
                </div>
            </div>

            <NSFWConfirmationDialog
                isOpen={showNSFWModal}
                onOpenChange={setShowNSFWModal}
                onConfirm={() => setIsNSFW(true)}
            />
        </div>
    );
};

const TrackItem = ({ track, onSelect, isSelected }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const togglePreview = (e) => {
        e.stopPropagation();
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else {
                document.querySelectorAll('audio').forEach(el => { if (el !== audioRef.current) el.pause(); });
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div
            className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors group border border-transparent",
                isSelected && "bg-zinc-800/80 border-primary/30"
            )}
            onClick={() => onSelect(track)}
        >
            <div className="relative h-12 w-12 rounded overflow-hidden bg-zinc-800 shrink-0">
                <img src={track.cover} alt={track.title} className="h-full w-full object-cover" />
                <button
                    onClick={togglePreview}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    {isPlaying ? <Pause className="h-5 w-5 text-white fill-current" /> : <Play className="h-5 w-5 text-white fill-current" />}
                </button>
                <audio ref={audioRef} src={track.audioUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"} onEnded={() => setIsPlaying(false)} />
            </div>

            <div className="flex-1 min-w-0">
                <h4 className={cn("text-sm font-semibold truncate", isSelected ? "text-primary" : "text-white")}>{track.title}</h4>
                <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
            </div>

            <div className="text-xs text-zinc-500 font-mono">
                {track.duration}
            </div>

            {isSelected && <Check className="h-4 w-4 text-primary ml-2" />}
        </div>
    );
};

const MusicPickerModal = ({ isOpen, onClose, onSelect, selectedTrack }) => {
    const { newReleases, likedMedia } = useMedia();
    const [activeTab, setActiveTab] = useState('trending');

    const trendingMusic = [...newReleases].sort(() => Math.random() - 0.5);
    const likedMusic = likedMedia.filter(item => item.type === 'audio');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-zinc-800">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Music className="h-5 w-5 text-primary" />
                        Select Audio
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="trending" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-[450px]">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
                            <TabsTrigger value="trending">Trending</TabsTrigger>
                            <TabsTrigger value="new">New</TabsTrigger>
                            <TabsTrigger value="liked">Liked</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 px-6 py-4">
                        <TabsContent value="trending" className="mt-0 space-y-1">
                            {trendingMusic.map((track) => (
                                <TrackItem
                                    key={`trending-${track.id}`}
                                    track={track}
                                    onSelect={(t) => { onSelect(t); onClose(); }}
                                    isSelected={selectedTrack?.id === track.id}
                                />
                            ))}
                        </TabsContent>

                        <TabsContent value="new" className="mt-0 space-y-1">
                            {newReleases.map((track) => (
                                <TrackItem
                                    key={`new-${track.id}`}
                                    track={track}
                                    onSelect={(t) => { onSelect(t); onClose(); }}
                                    isSelected={selectedTrack?.id === track.id}
                                />
                            ))}
                        </TabsContent>

                        <TabsContent value="liked" className="mt-0 space-y-1">
                            {likedMusic.length > 0 ? (
                                likedMusic.map((track) => (
                                    <TrackItem
                                        key={`liked-${track.id}`}
                                        track={track}
                                        onSelect={(t) => { onSelect(t); onClose(); }}
                                        isSelected={selectedTrack?.id === track.id}
                                    />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                                    <p className="text-sm">No liked songs found.</p>
                                    <p className="text-xs">Go to Music Mode to like songs!</p>
                                </div>
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

const MintMomentForm = ({ onPostSuccess }) => {
    const { user } = useAuth();
    const { addPost } = useContent();
    const { toast } = useToast();
    const [step, setStep] = useState('capture');
    const [capturedImage, setCapturedImage] = useState(null);
    const [locationData, setLocationData] = useState(null);
    const [isLocating, setIsLocating] = useState(true);
    const [title, setTitle] = useState('');
    const [isMinting, setIsMinting] = useState(false);
    const [permissionError, setPermissionError] = useState(null);
    const [coverFile, setCoverFile] = useState(null);


    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startCamera = async () => {
        setPermissionError(null);
        setIsLocating(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setLocationData({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            name: `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`
                        });
                        setIsLocating(false);
                    },
                    (error) => {
                        console.error("Geo error:", error);
                        setPermissionError("Location access denied. Verification required to mint.");
                        setIsLocating(false);
                        stopStream();
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                setPermissionError("Geolocation not supported.");
                setIsLocating(false);
            }
        } catch (err) {
            console.error("Media error:", err);
            setPermissionError("Camera and Microphone access required to mint a moment.");
            setIsLocating(false);
        }
    };

    useEffect(() => {
        if (step === 'capture') startCamera();
        return () => stopStream();
    }, [step]);

    const handleRetake = () => {
        setCapturedImage(null);
        setStep('capture');
    };

    const handleCapture = () => {
        if (!videoRef.current || isLocating || permissionError) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(imageUrl);
        setStep('review');
        stopStream();
    };

    const handleMint = async () => {
        if (!title.trim()) {
            toast({ title: "Title Required", description: "Name your moment before minting.", variant: "destructive" });
            return;
        }
        setIsMinting(true);

        await new Promise(resolve => setTimeout(resolve, 2000));

        const newPost = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'mint',
            user: {
                name: user.name,
                username: user.username,
                avatar: user.avatar,
                verified: user.verified
            },
            timestamp: "Just now",
            content: { text: title },
            mintData: {
                image: capturedImage,
                title: title,
                creator: user,
                timestamp: new Date().toLocaleString(),
                location: locationData,
                asaId: Math.floor(Math.random() * 90000000) + 10000000,
                transactionId: "TX-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
                edition: 1,
                totalEditions: 1,
                isVerifiedLocation: true
            },
            engagement: { likes: 0, comments: 0, shares: 0 },
            isNSFW: false,
            isSubscriberOnly: false
        };

        addPost(newPost);
        toast({ title: "Moment Minted! 💎", description: "Your verified collectible is now on chain." });
        onPostSuccess();
    };

    if (step === 'capture') {
        return (
            <div className="flex flex-col h-full bg-card rounded-xl overflow-hidden relative">
                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                    {permissionError ? (
                        <div className="text-center p-6 space-y-4">
                            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                            <h3 className="text-xl font-bold text-destructive">Access Denied</h3>
                            <p className="text-muted-foreground">{permissionError}</p>
                            <Button onClick={startCamera} variant="outline">Try Again</Button>
                        </div>
                    ) : (
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    )}

                    <canvas ref={canvasRef} className="hidden" />

                    {!permissionError && (
                        <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4 z-10 pointer-events-none">
                            {isLocating ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur rounded-full text-primary">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm font-mono">Verifying GPS & Media...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-500 rounded-full backdrop-blur border border-green-500/30 text-xs font-mono mb-2">
                                        <MapPin className="h-3 w-3" /> GPS LOCKED
                                    </div>
                                    <Button
                                        size="lg"
                                        className="h-16 w-16 rounded-full border-4 border-white bg-transparent hover:bg-white/20 ring-4 ring-primary/50 transition-all hover:scale-105 active:scale-95"
                                        onClick={handleCapture}
                                    >
                                        <span className="sr-only">Capture</span>
                                    </Button>
                                    <p className="text-[10px] text-white/50 font-mono mt-2">TAP TO MINT</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full flex flex-col bg-card p-4 rounded-xl">
            <div className="relative aspect-video rounded-lg overflow-hidden border border-primary/30 shadow-glow-gold-sm flex-shrink-0">
                <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <div className="flex items-center gap-2 text-primary font-mono text-xs">
                        <MapPin className="h-3 w-3" />
                        {locationData?.lat.toFixed(4)}, {locationData?.lng.toFixed(4)}
                    </div>
                    <div className="text-white text-sm font-bold">{new Date().toLocaleTimeString()}</div>
                </div>
            </div>

            <div className="space-y-4 flex-1">
                <div className="space-y-2">
                    <Label className="text-foreground">Name your Moment</Label>
                    <Input
                        placeholder="e.g. Sunset at Shibuya"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="bg-black/20 border-white/10 text-lg font-bold text-white"
                    />
                </div>

                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                        <Database className="h-4 w-4" /> Blockchain Metadata
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                        <div>Asset Type: <span className="text-white">ASA (Algorand)</span></div>
                        <div>Supply: <span className="text-white">1 of 1</span></div>
                        <div>Creator: <span className="text-white">@{user.username}</span></div>
                        <div>Verified: <span className="text-green-400">TRUE</span></div>
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
                <Button variant="outline" className="flex-1" onClick={handleRetake}>Retake</Button>
                <Button className="flex-[2] bg-primary text-black hover:bg-primary/90 font-bold" onClick={handleMint} disabled={isMinting}>
                    {isMinting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Minting...</> : 'Mint Moment'}
                </Button>
            </div>
        </div>
    );
};

const PostComposer = ({ type, onBack, onPostSuccess }) => {
    const { user } = useAuth();
    const { addPost } = useContent();
    const { toast } = useToast();
    const [text, setText] = useState('');
    const [additionalData, setAdditionalData] = useState({});
    const [isNSFW, setIsNSFW] = useState(false);
    const [isSubscriberOnly, setIsSubscriberOnly] = useState(false);
    const [isMintable, setIsMintable] = useState(false);
    const toHashtagArray = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string" && value.trim()) return value.split(",").map(s => s.trim()).filter(Boolean);
        return [];
    };

    const computeDurationDays = (startDate, endDate) => {
        if (!startDate || !endDate) return null;
        const a = new Date(startDate);
        const b = new Date(endDate);
        const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
        return Number.isFinite(diff) && diff > 0 ? diff : 1;
    };

    const pollDurationToExpiresAt = (duration) => {
        const now = Date.now();
        let ms = 24 * 60 * 60 * 1000; // default 24h
        if (duration === "1_hour") ms = 60 * 60 * 1000;
        if (duration === "24_hours" || duration === "1_day") ms = 24 * 60 * 60 * 1000;
        if (duration === "3_days") ms = 3 * 24 * 60 * 60 * 1000;
        if (duration === "1_week") ms = 7 * 24 * 60 * 60 * 1000;
        return new Date(now + ms).toISOString();
    };

    // simple numeric mapping (adjust later if you want real budget)
    const budgetToNumber = (b) => {
        if (typeof b === "number") return b;
        if (b === "budget") return 300;
        if (b === "moderate") return 1000;
        if (b === "luxury") return 3000;
        return 1000;
    };


    const handlePost = async () => {
        if (type === "mint" || type === "moments") return;

        // basic validation
        if (type === "thread" && !text.trim()) {
            toast({ title: "Empty Post", description: "Please write something!", variant: "destructive" });
            return;
        }

        if (type === "poll") {
            const opts = additionalData?.poll?.options || [];
            if (!text.trim() || !Array.isArray(opts) || opts.filter(o => o.trim()).length < 2) {
                toast({ title: "Poll Invalid", description: "Question + at least 2 options required.", variant: "destructive" });
                return;
            }
        }

        if (type === "trip" && !text.trim()) {
            toast({ title: "Trip Invalid", description: "Trip text is required.", variant: "destructive" });
            return;
        }

        try {
            // THREAD
            if (type === "thread") {
                const images = additionalData?.images || []; // for now keep [] until DO upload is added
                const hashtags = toHashtagArray(additionalData?.hashtags);

                const resp = await api.post("/user/community/thread", {
                    text,
                    images,       // expect array of {url,type} or url strings
                    hashtags
                });

                const created = resp?.data?.result?.post;
                addPost(created); // or map to your UI shape if needed
                toast({ title: "Posted!", description: "Your thread is live." });
                onPostSuccess();
                return;
            }

            // POLL
            if (type === "poll") {
                const poll = additionalData?.poll || {};
                const options = (poll.options || []).map(o => String(o).trim()).filter(Boolean);
                const expiresAt = pollDurationToExpiresAt(poll.duration);

                const resp = await api.post("/user/community/poll", {
                    question: text,
                    options,
                    allowsMultiple: false,
                    expiresAt
                });

                const created = resp?.data?.result?.post;
                addPost(created);
                toast({ title: "Posted!", description: "Your poll is live." });
                onPostSuccess();
                return;
            }

            // TRIP
            if (type === "trip") {
                const trip = additionalData?.trip || {};
                const durationDays = trip.durationDays ?? computeDurationDays(trip.startDate, trip.endDate);
                const destinations = Array.isArray(trip.destinations) ? trip.destinations : [];
                let coverUrl = "";
                if (trip.coverFile) {
                    coverUrl = await uploadImageToSpaces(trip.coverFile, "trips/covers");
                }
                const resp = await api.post("/user/community/trip", {
                    text,
                    cover_image: coverUrl || "",     // IMPORTANT: must be a URL, not blob preview
                    duration: durationDays || 1,
                    budget: budgetToNumber(trip.budget),
                    destinations
                });

                const created = resp?.data?.result?.post;
                addPost(created);
                toast({ title: "Posted!", description: "Your trip post is live." });
                onPostSuccess();
                return;
            }
            // EVENT
if (type === "event") {
  const ev = additionalData?.event || {};

  if (!ev.title?.trim()) {
    toast({ title: "Event Invalid", description: "Event title is required.", variant: "destructive" });
    return;
  }
  if (!ev.date || !ev.time) {
    toast({ title: "Event Invalid", description: "Event date and time are required.", variant: "destructive" });
    return;
  }

  // Combine date + time to ISO for backend "startAt"
  const startAt = new Date(`${ev.date}T${ev.time}`).toISOString();

  // Upload cover to Spaces (optional)
  let coverUrl = "";
  if (ev.coverFile) {
    coverUrl = await uploadImageToSpaces(ev.coverFile, "events/covers");
  }

  const payload = {
    title: ev.title,
    description: ev.description || "",
    cover_image: coverUrl || "",
    startAt,
    location: ev.location || { name: "" },
    isPaid: !!ev.isPaid,
    price: ev.isPaid ? ev.price : 0,
    currency: ev.currency || "USD",
  };

  const resp = await api.post("/user/community/event", payload);
  const created = resp?.data?.result?.post;

  addPost(created);
  toast({ title: "Posted!", description: "Your event is live." });
  onPostSuccess();
  return;
}

        } catch (err) {
            console.error(err);
            toast({
                title: "Post failed",
                description: err?.response?.data?.message || err?.message || "Something went wrong",
                variant: "destructive"
            });
        }
    };


    const renderForm = () => {
        switch (type) {
            case 'moments': return <MomentsForm onPostSuccess={onPostSuccess} />;
            case 'thread': return <ThreadForm onChange={(data) => setAdditionalData(data)} />;
            case 'poll': return <PollForm onChange={(data) => setAdditionalData(data)} />;
            case 'trip': return <TripForm onChange={(data) => setAdditionalData(data)} />;
            case 'event': return <EventForm onChange={(data) => setAdditionalData(data)} />;
            case 'mint': return <MintMomentForm onPostSuccess={onPostSuccess} />;
            default: return null;
        }
    };

    if (type === 'mint') {
        return (
            <div className="flex flex-col h-full bg-background">
                <div className="flex items-center gap-4 p-4 border-b border-border">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-foreground"><ArrowLeft /></Button>
                    <DialogTitle className="text-xl flex items-center gap-2 text-primary"><Aperture className="h-5 w-5 text-primary" /> Mint a Moment</DialogTitle>
                </div>
                <div className="p-4 flex-grow overflow-y-auto">
                    <MintMomentForm onPostSuccess={onPostSuccess} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex items-center gap-4 p-4 border-b border-border">
                <Button variant="ghost" size="icon" onClick={onBack} className="text-foreground"><ArrowLeft /></Button>
                <DialogTitle className="text-xl capitalize text-primary">Create {type === 'moments' ? 'Moment' : type}</DialogTitle>
            </div>

            <div className="p-4 flex-grow overflow-y-auto">
                <div className="flex items-start space-x-4">
                    <Avatar>
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="w-full">
                        {type !== 'moments' && type !== 'event' && (
                            <Textarea
                                placeholder={type === 'poll' ? "What's the question?" : "What's on your mind, traveler?"}
                                className="bg-transparent border-0 text-base resize-none focus-visible:ring-0 p-0 shadow-none min-h-[80px] text-foreground"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                            />
                        )}
                        <div className="mt-2">
                            {renderForm()}
                        </div>
                        {type !== 'moments' && (
                            <ContentSettings
                                isNSFW={isNSFW}
                                setIsNSFW={setIsNSFW}
                                isSubscriberOnly={isSubscriberOnly}
                                setIsSubscriberOnly={setIsSubscriberOnly}
                                isMintable={isMintable}
                                setIsMintable={setIsMintable}
                            />
                        )}
                    </div>
                </div>
            </div>

            {type !== 'moments' && (
                <DialogFooter className="p-4 border-t border-border">
                    <Button className="w-full" onClick={handlePost}>Post</Button>
                </DialogFooter>
            )}
        </div>
    );
};

const EventForm = ({ onChange }) => {
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [date, setDate] = useState('');   // yyyy-mm-dd
  const [time, setTime] = useState('');   // HH:mm

  const [locationName, setLocationName] = useState('');

  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');

  const [coverPreview, setCoverPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    onChange({
      event: {
        title,
        description,
        date,
        time,
        location: { name: locationName },
        isPaid,
        price,
        currency,
        coverFile,         // ✅ real file for upload
        coverPreview,      // ✅ UI only
      }
    });
  }, [title, description, date, time, locationName, isPaid, price, currency, coverFile, coverPreview]);

  const handleCoverFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Cover must be an image.", variant: "destructive" });
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  return (
    <div className="space-y-4">
      <div
        className="aspect-[2/1] bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-border cursor-pointer hover:bg-muted/80 transition-colors relative overflow-hidden"
        onClick={() => coverInputRef.current?.click()}
      >
        {coverPreview ? (
          <>
            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> Change Cover
              </span>
            </div>
          </>
        ) : (
          <>
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Upload Event Cover</span>
          </>
        )}
        <input
          ref={coverInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => handleCoverFile(e.target.files?.[0])}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Event Title</Label>
        <Input
          placeholder="e.g. Summer Rooftop Party"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Description</Label>
        <Textarea
          placeholder="Details about the event..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="text-foreground"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-foreground">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Time</Label>
          <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="bg-muted/50" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-foreground">Location</Label>
        <Input
          placeholder="e.g. Karachi, DHA Phase 6"
          value={locationName}
          onChange={e => setLocationName(e.target.value)}
          className="bg-muted/50 text-foreground"
        />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-yellow-500" />
          <Label className="text-foreground">Paid Event</Label>
        </div>
        <Switch checked={isPaid} onCheckedChange={setIsPaid} />
      </div>

      {isPaid && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-foreground">Price</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="e.g. 10"
              className="bg-muted/50 text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="bg-muted/50 text-foreground">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="PKR">PKR</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};


const MomentsForm = ({ onPostSuccess }) => {
    const { toast } = useToast();
    const { user } = useAuth();
    const { addReel } = useContent();
    const [activeTab, setActiveTab] = useState('upload');

    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [coverFile, setCoverFile] = useState(null);


    const [isRecording, setIsRecording] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const videoPreviewRef = useRef(null);
    const streamRef = useRef(null);

    const [title, setTitle] = useState('');
    const [caption, setCaption] = useState('');
    const [hashtags, setHashtags] = useState([]);
    const [currentHashtag, setCurrentHashtag] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isNSFW, setIsNSFW] = useState(false);
    const [isSubscriberOnly, setIsSubscriberOnly] = useState(false);
    const [isMintable, setIsMintable] = useState(false);

    const [selectedMusic, setSelectedMusic] = useState(null);
    const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);

    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }
            setIsCameraReady(true);
        } catch (err) {
            console.error("Camera error", err);
            toast({ title: "Camera Error", description: "Could not access camera/mic.", variant: "destructive" });
            setIsCameraReady(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraReady(false);
    };

    useEffect(() => {
        if (activeTab === 'record') startCamera();
        else stopCamera();
        return () => stopCamera();
    }, [activeTab]);

    const startRecording = () => {
        if (!streamRef.current || !streamRef.current.active) {
            toast({ title: "Camera Error", description: "Camera stream is not active.", variant: "destructive" });
            return;
        }

        setRecordedChunks([]);
        setIsRecording(true);
        setRecordingTime(0);

        try {
            const mediaRecorder = new MediaRecorder(streamRef.current);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) setRecordedChunks(prev => [...prev, event.data]);
            };

            mediaRecorder.start();
        } catch (e) {
            console.error("MediaRecorder error:", e);
            toast({ title: "Recording Error", description: "Failed to start recording.", variant: "destructive" });
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const handleUseRecording = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setFile(blob);
        setPreviewUrl(url);
        setActiveTab('metadata');
    };

    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } else clearInterval(interval);
        return () => clearInterval(interval);
    }, [isRecording]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleFile = (selectedFile) => {
        if (!selectedFile.type.startsWith('video/')) {
            toast({ title: "❌ Invalid File Type", description: "Please upload a video file.", variant: "destructive" });
            return;
        }
        setFile(selectedFile);
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setActiveTab('metadata');
    };

    const handleCoverFile = (selectedFile) => {
        if (!selectedFile?.type?.startsWith("image/")) {
            toast({ title: "❌ Invalid File Type", description: "Please upload an image file for the cover.", variant: "destructive" });
            return;
        }
        setCoverFile(selectedFile); // ✅ keep actual file for upload
        setCoverPreview(URL.createObjectURL(selectedFile)); // ✅ preview for UI
    };

    const handleHashtagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
            e.preventDefault();
            const tag = currentHashtag.trim().replace(/^#/, '');
            if (tag && !hashtags.includes(tag)) {
                setHashtags([...hashtags, tag]);
                setCurrentHashtag('');
            }
        }
    };

    // Upload flow: Backend create upload → XHR PUT to Mux (with progress) → done
    // Mux webhook handles DB creation asynchronously; no polling needed
    const handleUpload = async () => {
        try {
            if (!file) return;

            if (!title.trim()) {
                toast({ title: "⚠️ Title Required", description: "Please give your Moment a title.", variant: "destructive" });
                return;
            }

            setUploading(true);
            setUploadProgress(0);

            let coverImageUrl = "";
            if (coverFile) {
                coverImageUrl = await uploadImageToSpaces(coverFile, "reels/thumbnails");
            }

            // 1) Create Mux Direct Upload via backend
            const createResp = await api.post('/mux/uploads', {
                contentType: 'reel',
                title,
                caption,
                description: caption,
                hashtags,
                coverImageUrl,
                backdropImages: [],
            });

            const upload = createResp?.data?.result?.upload;
            const uploadId = upload?.id;
            const uploadUrl = upload?.url;

            if (!uploadId || !uploadUrl) {
                throw new Error('Upload session not created (missing uploadId/uploadUrl)');
            }

            // 2) PUT file directly to Mux with XHR so we get upload progress
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100));
                    }
                };
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) resolve();
                    else reject(new Error(`Mux upload failed: HTTP ${xhr.status}`));
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(file);
            });

            // 3) File is in Mux — webhook will create the Reel in DB automatically.
            // Add optimistic item to local feed so the user sees it immediately.
            const newReel = {
                id: uploadId,
                type: 'clip',
                videoUrl: null,
                thumbnail: coverPreview,
                title,
                description: caption,
                content: { title, description: caption },
                user: {
                    name: user?.name,
                    username: user?.username,
                    avatar: user?.avatar,
                    verified: user?.verified,
                },
                engagement: { likes: 0, comments: 0, shares: 0 },
                tags: hashtags.length > 0 ? hashtags : ['new'],
                isNew: true,
                isNSFW,
                isSubscriberOnly,
                music: selectedMusic ? {
                    id: selectedMusic.id,
                    title: selectedMusic.title,
                    artist: selectedMusic.artist,
                    cover: selectedMusic.cover,
                } : null,
            };

            addReel(newReel);

            toast({
                title: "✅ Moment Uploaded!",
                description: "Your Moment is being processed and will be live shortly.",
            });

            setUploading(false);
            setUploadProgress(0);
            onPostSuccess();
        } catch (err) {
            console.error(err);
            setUploading(false);
            setUploadProgress(0);

            toast({
                title: "Upload failed",
                description: err?.response?.data?.message || err?.message || "Upload failed",
                variant: "destructive",
            });
        }
    };

    if (activeTab === 'metadata') {
        return (
            <div className="space-y-6 w-full max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFile(null); setPreviewUrl(null); setActiveTab('upload'); }}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                </div>

                <div className="space-y-6">
                    <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden max-h-[400px] mx-auto relative flex justify-center">
                        <video src={previewUrl} className="h-full object-contain" controls />

                        {selectedMusic && (
                            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-lg p-2 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <div className="h-8 w-8 rounded bg-zinc-800 overflow-hidden shrink-0">
                                    <img src={selectedMusic.cover} className="h-full w-full object-cover" alt="Music" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{selectedMusic.title}</p>
                                    <p className="text-[10px] text-zinc-300 truncate">{selectedMusic.artist}</p>
                                </div>
                                <button onClick={() => setSelectedMusic(null)} className="text-zinc-400 hover:text-white p-1">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-foreground">Cover Image</Label>
                            <div
                                className="h-20 bg-muted rounded flex items-center justify-center cursor-pointer border-dashed border-2 border-border"
                                onClick={() => coverInputRef.current?.click()}
                            >
                                {coverPreview ? (
                                    <img src={coverPreview} className="h-full object-contain" />
                                ) : (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" /> Upload Cover
                                    </span>
                                )}
                            </div>
                            <input
                                ref={coverInputRef}
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => e.target.files[0] && handleCoverFile(e.target.files[0])}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground">Title *</Label>
                            <Input placeholder="Moment Title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-foreground" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground">Caption</Label>
                            <Textarea placeholder="Describe your Moment..." value={caption} onChange={(e) => setCaption(e.target.value)} className="text-foreground" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground">Audio</Label>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-muted-foreground hover:text-primary border-border hover:bg-muted"
                                onClick={() => setIsMusicPickerOpen(true)}
                            >
                                <Music className="mr-2 h-4 w-4" />
                                {selectedMusic ? `${selectedMusic.title} - ${selectedMusic.artist}` : "Add Audio Track"}
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground">Hashtags</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9 text-foreground"
                                    placeholder="Add tags..."
                                    value={currentHashtag}
                                    onChange={e => setCurrentHashtag(e.target.value)}
                                    onKeyDown={handleHashtagKeyDown}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {hashtags.map(t => <span key={t} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">#{t}</span>)}
                            </div>
                        </div>

                        <ContentSettings
                            isNSFW={isNSFW}
                            setIsNSFW={setIsNSFW}
                            isSubscriberOnly={isSubscriberOnly}
                            setIsSubscriberOnly={setIsSubscriberOnly}
                            isMintable={isMintable}
                            setIsMintable={setIsMintable}
                        />
                    </div>

                    {uploading && uploadProgress > 0 && (
                        <div className="w-full space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Uploading…</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        </div>
                    )}
                    <Button size="lg" className="w-full" onClick={handleUpload} disabled={uploading}>
                        {uploading
                            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Preparing…'}</>
                            : 'Share Moment'
                        }
                    </Button>
                </div>

                <MusicPickerModal
                    isOpen={isMusicPickerOpen}
                    onClose={() => setIsMusicPickerOpen(false)}
                    onSelect={setSelectedMusic}
                    selectedTrack={selectedMusic}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full max-w-2xl mx-auto h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload"><Upload className="mr-2 h-4 w-4" /> Upload</TabsTrigger>
                    {/* <TabsTrigger value="record"><Camera className="mr-2 h-4 w-4" /> Record</TabsTrigger> */}
                </TabsList>

                <TabsContent value="upload" className="flex-1 flex items-center justify-center">
                    <div
                        className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-all min-h-[300px] w-full"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="bg-primary/10 rounded-full p-5 mb-4"><Upload className="h-10 w-10 text-primary" /></div>
                        <h3 className="font-bold text-xl mb-2 text-foreground">Upload Moment Video</h3>
                        <p className="text-sm text-muted-foreground">Vertical (9:16) recommended.</p>
                        <input ref={fileInputRef} type="file" className="hidden" accept="video/*" onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
                    </div>
                </TabsContent>

                <TabsContent value="record" className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-full aspect-[9/16] bg-black rounded-lg overflow-hidden max-h-[500px] flex justify-center">
                        <video ref={videoPreviewRef} autoPlay muted playsInline className="h-full w-full object-cover transform scale-x-[-1]" />

                        <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full bg-red-500", isRecording && "animate-pulse")} />
                            <span className="text-white font-mono text-sm">{formatTime(recordingTime)}</span>
                        </div>

                        <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6">
                            {!isRecording ? (
                                <Button
                                    size="icon"
                                    className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 border-4 border-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={startRecording}
                                    disabled={!isCameraReady}
                                >
                                    <div className="w-6 h-6 bg-transparent" />
                                </Button>
                            ) : (
                                <Button
                                    size="icon"
                                    className="h-16 w-16 rounded-full bg-white hover:bg-gray-200 border-4 border-red-500"
                                    onClick={stopRecording}
                                >
                                    <div className="w-6 h-6 bg-red-500 rounded-sm" />
                                </Button>
                            )}
                        </div>
                    </div>
                    {recordedChunks.length > 0 && !isRecording && (
                        <Button onClick={handleUseRecording} className="w-full">Use Recorded Video</Button>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
};

const ThreadForm = ({ onChange }) => { useEffect(() => onChange({ images: [] }), []); return <div className="p-4 bg-muted/20 rounded text-sm text-center text-foreground">Thread options (Images, etc)</div>; };

const PollForm = ({ onChange }) => {
    const [options, setOptions] = useState(['', '']);
    const [duration, setDuration] = useState('1_day');
    const [location, setLocation] = useState('');
    const [hashtags, setHashtags] = useState([]);
    const [currentHashtag, setCurrentHashtag] = useState('');

    useEffect(() => {
        onChange({
            poll: {
                options: options.filter(o => o.trim() !== ''),
                totalVotes: 0,
                duration,
                location,
                hashtags
            }
        });
    }, [options, duration, location, hashtags]);

    const handleAddOption = () => { if (options.length < 5) setOptions([...options, '']); };
    const handleOptionChange = (index, value) => { const newOptions = [...options]; newOptions[index] = value; setOptions(newOptions); };
    const handleRemoveOption = (index) => { if (options.length > 2) setOptions(options.filter((_, i) => i !== index)); };

    const handleHashtagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
            e.preventDefault();
            const tag = currentHashtag.trim().replace(/^#/, '');
            if (tag && !hashtags.includes(tag)) { setHashtags([...hashtags, tag]); setCurrentHashtag(''); }
        }
    };

    const removeHashtag = (tag) => setHashtags(hashtags.filter(t => t !== tag));

    return (
        <div className="space-y-5 mt-4">
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-foreground">Poll Options</Label>
                    <span className="text-xs text-muted-foreground">{options.length}/5</span>
                </div>

                {options.map((opt, index) => (
                    <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                        <Input
                            placeholder={`Option ${index + 1}`}
                            value={opt}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            className="bg-muted text-foreground border-input focus:border-primary"
                        />
                        {options.length > 2 && (
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemoveOption(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}

                {options.length < 5 && (
                    <Button type="button" variant="outline" size="sm" onClick={handleAddOption} className="w-full border-dashed">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-foreground">Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="bg-muted text-foreground">
                            <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1_hour">1 Hour</SelectItem>
                            <SelectItem value="24_hours">24 Hours</SelectItem>
                            <SelectItem value="3_days">3 Days</SelectItem>
                            <SelectItem value="1_week">1 Week</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-foreground">Location (Optional)</Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Add location..."
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="pl-9 bg-muted text-foreground"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-foreground">Hashtags</Label>
                <div className="relative">
                    <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 bg-muted text-foreground"
                        placeholder="Add tags..."
                        value={currentHashtag}
                        onChange={e => setCurrentHashtag(e.target.value)}
                        onKeyDown={handleHashtagKeyDown}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {hashtags.map(t => (
                        <span key={t} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            #{t}
                            <button onClick={() => removeHashtag(t)} className="hover:text-primary-foreground"><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TripForm = ({ onChange }) => {
    const [destinations, setDestinations] = useState([{ id: 1, name: '' }]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [budget, setBudget] = useState('moderate');
    const [location, setLocation] = useState('');
    const [hashtags, setHashtags] = useState([]);
    const [currentHashtag, setCurrentHashtag] = useState('');
    const [coverPreview, setCoverPreview] = useState(null);
    const coverInputRef = useRef(null);
    const [coverFile, setCoverFile] = useState(null);


    useEffect(() => {
        onChange({
            trip: {
                title: "My Trip",
                destinations: destinations.map(d => d.name).filter(n => n.trim() !== ''),
                startDate,
                endDate,
                budget,
                location,
                hashtags,
                coverFile,
            }
        });
    }, [destinations, startDate, endDate, budget, location, hashtags, coverPreview]);

    const handleCoverFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) return;

        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };


    const handleAddDestination = () => setDestinations([...destinations, { id: Math.random(), name: '' }]);
    const handleDestinationChange = (id, value) => setDestinations(destinations.map(d => d.id === id ? { ...d, name: value } : d));
    const handleRemoveDestination = (id) => { if (destinations.length > 1) setDestinations(destinations.filter(d => d.id !== id)); };

    const handleHashtagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
            e.preventDefault();
            const tag = currentHashtag.trim().replace(/^#/, '');
            if (tag && !hashtags.includes(tag)) { setHashtags([...hashtags, tag]); setCurrentHashtag(''); }
        }
    };

    const removeHashtag = (tag) => setHashtags(hashtags.filter(t => t !== tag));

    return (
        <div className="space-y-5 mt-4">
            <div className="aspect-[2.5/1] bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-border cursor-pointer hover:bg-muted/80 transition-colors relative overflow-hidden group" onClick={() => coverInputRef.current?.click()}>
                {coverPreview ? (
                    <>
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-medium flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Change Trip Cover</span>
                        </div>
                    </>
                ) : (
                    <>
                        <Plane className="h-8 w-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Upload Trip Cover</span>
                    </>
                )}
                <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleCoverFile(e.target.files[0])} />
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-foreground">Itinerary (Destinations)</Label>
                </div>
                {destinations.map((dest, index) => (
                    <div key={dest.id} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-center w-8 bg-muted/50 rounded text-muted-foreground text-xs font-mono">{index + 1}</div>
                        <Input
                            placeholder={index === 0 ? "Starting Point" : "Next Stop"}
                            value={dest.name}
                            onChange={(e) => handleDestinationChange(dest.id, e.target.value)}
                            className="bg-muted/50 text-foreground"
                        />
                        {destinations.length > 1 && (
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleRemoveDestination(dest.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddDestination} className="w-full border-dashed">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Destination
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-foreground">Start Date</Label>
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                    <Label className="text-foreground">End Date</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-muted/50" />
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-foreground">Budget & Style</Label>
                <div className="grid grid-cols-3 gap-2">
                    {['budget', 'moderate', 'luxury'].map((b) => (
                        <div
                            key={b}
                            onClick={() => setBudget(b)}
                            className={cn(
                                "cursor-pointer rounded-lg border p-3 flex flex-col items-center justify-center gap-1 transition-all",
                                budget === b ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-border hover:bg-muted/50"
                            )}
                        >
                            <DollarSign className={cn("h-4 w-4", budget === b ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-xs capitalize font-medium">{b}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-foreground">Hashtags</Label>
                <div className="relative">
                    <Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 bg-muted/50 text-foreground"
                        placeholder="Add tags..."
                        value={currentHashtag}
                        onChange={e => setCurrentHashtag(e.target.value)}
                        onKeyDown={handleHashtagKeyDown}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {hashtags.map(t => (
                        <span key={t} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            #{t}
                            <button onClick={() => removeHashtag(t)} className="hover:text-primary-foreground"><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PostModal = ({ isOpen, onOpenChange, initialPostType }) => {
    const [postType, setPostType] = useState(initialPostType);
    const [mediaUploadOpen, setMediaUploadOpen] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { if (isOpen) setPostType(initialPostType); }, [isOpen, initialPostType]);

    const handleGoLive = () => { onOpenChange(false); navigate('/go-live'); };
    const handlePostSuccess = () => { onOpenChange(false); setPostType(null); };
    const handleMediaUpload = () => { onOpenChange(false); setMediaUploadOpen(true); };

    return (
        <>
        <UploadMomentModal isOpen={mediaUploadOpen} onOpenChange={setMediaUploadOpen} />
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setPostType(null); onOpenChange(open); }}>
            <DialogContent className="sm:max-w-3xl p-0 gap-0 data-[state=open]:h-[90vh] data-[state=open]:max-h-[900px] flex flex-col overflow-hidden bg-background">
                <AnimatePresence mode="wait">
                    {!postType ? (
                        <motion.div key="chooser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl text-center text-primary">Create a Post</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <PostTypeButton icon={Film} label="Upload Moment" onClick={() => setPostType('moments')} active={postType === 'moments'} />
                                <PostTypeButton icon={Radio} label="Go Live" onClick={handleGoLive} />
                                <PostTypeButton icon={MessageSquare} label="Thread" onClick={() => setPostType('thread')} active={postType === 'thread'} />
                                <PostTypeButton icon={BarChart2} label="Poll" onClick={() => setPostType('poll')} active={postType === 'poll'} />
                                <PostTypeButton icon={MapPin} label="Trip" onClick={() => setPostType('trip')} active={postType === 'trip'} />
                                <PostTypeButton icon={Calendar} label="Event" onClick={() => setPostType('event')} active={postType === 'event'} />
                                <PostTypeButton icon={Aperture} label="Mint a Moment" onClick={() => setPostType('mint')} special={true} />
                                {user?.isAdmin && (
                                    <PostTypeButton icon={UploadCloud} label="Upload to Media Mode" onClick={handleMediaUpload} special={true} />
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="composer" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="h-full flex flex-col overflow-hidden">
                            <PostComposer type={postType} onBack={() => setPostType(null)} onPostSuccess={handlePostSuccess} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </DialogContent>
        </Dialog>
        </>
    );
};

export default PostModal;
