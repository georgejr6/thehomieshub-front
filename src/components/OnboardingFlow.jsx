import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/api/homieshub';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home, Compass, Radio, BookOpen, Trophy, Clapperboard,
  Wallet, MessageSquare, ChevronRight, ChevronLeft,
  Shield, Check, Sparkles, X, Upload, Loader2, User,
} from 'lucide-react';

const FEATURES = [
  { icon: Home,          name: 'Home Feed',       desc: 'Your daily feed of posts, videos, and reels from the homies you follow.' },
  { icon: Compass,       name: 'Explore',          desc: 'Discover trending content and find new people in the community.' },
  { icon: Radio,         name: 'Live Streaming',   desc: 'Watch live streams in real time or go live yourself from Creator Studio.' },
  { icon: BookOpen,      name: 'Library',          desc: 'Your personal collection of saved videos and premium content.' },
  { icon: Trophy,        name: 'Wagers',           desc: 'Create challenges, make bets, and compete with the community.' },
  { icon: Clapperboard,  name: 'Creator Studio',   desc: 'Upload videos, post reels, and stream live to your followers.' },
  { icon: Wallet,        name: 'Wallet',           desc: 'Earn points, send gifts to other homies, and track your balance.' },
  { icon: MessageSquare, name: 'Inbox',            desc: 'Direct message the homies and keep your conversations going.' },
];

const STEP_WELCOME = 0;
const STEP_PROFILE = 1;
const STEP_CONNECT = 2;
const STEP_TOUR    = 3;
const STEP_DONE    = STEP_TOUR + FEATURES.length;
const TOTAL        = STEP_DONE + 1;

const slide = {
  enter: (d) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (d) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
};

export default function OnboardingFlow({ isOpen, onClose }) {
  const { user, stopTutorial, refreshMe } = useAuth();

  const [step, setStep] = useState(0);
  const [dir,  setDir]  = useState(1);

  // Profile form state
  const [displayName, setDisplayName] = useState('');
  const [username,    setUsername]    = useState('');
  const [bio,         setBio]         = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile,    setAvatarFile]    = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [nameError,     setNameError]     = useState('');
  const [userError,     setUserError]     = useState('');
  const fileRef = useRef();

  useEffect(() => {
    if (isOpen && user) {
      setStep(0);
      setDir(1);
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setAvatarPreview(user.avatar || null);
      setAvatarFile(null);
      setNameError('');
      setUserError('');
    }
  }, [isOpen, user?.sub]);

  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n); };
  const next = () => go(Math.min(step + 1, TOTAL - 1));
  const prev = () => go(Math.max(step - 1, 0));

  const finish = () => { stopTutorial(); onClose(); };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const saveProfile = async () => {
    setNameError(''); setUserError('');
    let hasError = false;
    if (!displayName.trim()) { setNameError('Display name is required.'); hasError = true; }
    if (!username.trim() || username.length < 3) { setUserError('Username must be at least 3 characters.'); hasError = true; }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) { setUserError('Letters, numbers, _ and - only.'); hasError = true; }
    if (hasError) return;

    setSaving(true);
    try {
      let avatarUrl = user?.avatar || '';
      if (avatarFile) {
        const form = new FormData();
        form.append('file', avatarFile);
        const r = await api.post('/files/upload?folder=avatars', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        avatarUrl = r?.data?.result?.url || avatarUrl;
      }
      await api.patch('/profile/me', { name: displayName.trim(), username: username.trim(), bio: bio.trim(), avatarUrl });
      await refreshMe();
      next();
    } catch (err) {
      if (err?.response?.status === 409) setUserError('That username is already taken.');
    } finally {
      setSaving(false);
    }
  };

  const isTourStep = step >= STEP_TOUR && step < STEP_DONE;
  const featIdx    = isTourStep ? step - STEP_TOUR : 0;
  const feature    = isTourStep ? FEATURES[featIdx] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}>
      <div className="relative w-full max-w-lg">

        {/* Skip */}
        {step < STEP_DONE && (
          <button onClick={finish} className="absolute -top-10 right-0 text-sm text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5">
            Skip <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {Array.from({ length: TOTAL - 1 }).map((_, i) => (
            <div key={i} className="h-1 rounded-full transition-all duration-300"
              style={{ width: i === step ? 24 : 8, background: i <= step ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={slide}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="bg-card border border-border rounded-2xl p-8 shadow-2xl max-h-[80vh] overflow-y-auto"
          >

            {/* ── WELCOME ── */}
            {step === STEP_WELCOME && (
              <div className="text-center space-y-6">
                <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                  <Sparkles className="h-10 w-10 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">Welcome to The Homies Hub</h2>
                  <p className="text-muted-foreground">The community built for the guys. Let's get you set up — takes about a minute.</p>
                </div>
                <div className="flex items-start gap-3 bg-muted/40 border border-border rounded-xl p-4 text-left">
                  <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your personal data — real name, email, provider info — is{' '}
                    <strong className="text-foreground">never visible to other members.</strong>{' '}
                    Only your chosen username and what you share is public.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={finish}>Skip</Button>
                  <Button className="flex-1" onClick={next}>Let's Go <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* ── PROFILE SETUP ── */}
            {step === STEP_PROFILE && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Set up your profile</h2>
                  <p className="text-sm text-muted-foreground mt-1">Choose how you appear to other members. Nothing here shows your real identity.</p>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      <AvatarImage src={avatarPreview} />
                      <AvatarFallback className="text-3xl bg-muted">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <button onClick={() => fileRef.current?.click()}
                      className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:bg-primary/90 transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleAvatarPick} />
                  </div>
                  <p className="text-xs text-muted-foreground">Upload a profile photo (optional, max 5MB)</p>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <Label>Display Name <span className="text-destructive">*</span></Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How you want to be known" maxLength={50} />
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label>Username <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="yourhandle" className="pl-8" maxLength={30} />
                  </div>
                  {userError && <p className="text-xs text-destructive">{userError}</p>}
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <Label>Bio <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Tell the homies a bit about yourself..." className="resize-none h-20" maxLength={500} />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button variant="outline" className="flex-1" onClick={next} disabled={saving}>Skip for now</Button>
                  <Button className="flex-1" onClick={saveProfile} disabled={saving}>
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save & Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* ── CONNECT ── */}
            {step === STEP_CONNECT && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Connect accounts</h2>
                  <p className="text-sm text-muted-foreground mt-1">Optional — helps the community recognize you.</p>
                </div>

                {/* Discord */}
                <div className="flex items-center gap-4 p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl">
                  <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{user?.discordUsername ? `Connected — @${user.discordUsername}` : 'Discord'}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.discordUsername ? 'Your tag shows on your profile.' : 'Connect anytime from Account Settings → Connections'}
                    </p>
                  </div>
                  {user?.discordUsername ? <Check className="h-4 w-4 text-green-500 flex-shrink-0" /> : null}
                </div>

                {/* Privacy note */}
                <div className="flex items-start gap-3 p-4 bg-muted/40 border border-border rounded-xl">
                  <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your email and real name are stored securely and used only for account recognition and support.{' '}
                    <strong className="text-foreground">They are never shown to other members.</strong>
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button className="flex-1" onClick={next}>Got it <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* ── FEATURE TOUR ── */}
            {isTourStep && feature && (() => {
              const Icon = feature.icon;
              return (
                <div className="text-center space-y-6">
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                    Feature {featIdx + 1} of {FEATURES.length}
                  </p>
                  <div className="flex justify-center">
                    <motion.div key={featIdx}
                      animate={{ boxShadow: ['0 0 0 0px rgba(240,185,77,0.55)', '0 0 0 22px rgba(240,185,77,0)', '0 0 0 0px rgba(240,185,77,0)'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                      className="p-6 rounded-full bg-primary/10 border border-primary/40">
                      <Icon className="h-14 w-14 text-primary" />
                    </motion.div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{feature.name}</h2>
                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="icon" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button className="flex-1" onClick={next}>
                      {featIdx < FEATURES.length - 1 ? 'Next' : 'Finish Tour'} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* ── DONE ── */}
            {step === STEP_DONE && (
              <div className="text-center space-y-6">
                <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                  className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
                  <Check className="h-10 w-10 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">You're in.</h2>
                  <p className="text-muted-foreground">You know the app. Now go connect with the homies.</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Replay this anytime from your profile menu → <strong className="text-foreground">Tutorial</strong>
                </p>
                <Button className="w-full" size="lg" onClick={finish}>
                  <Sparkles className="h-4 w-4 mr-2" /> Go to The Homies Hub
                </Button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
