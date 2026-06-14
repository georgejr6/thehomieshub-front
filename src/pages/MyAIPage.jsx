import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Bot, Sparkles, ChevronLeft, StopCircle, HelpCircle, ArrowRight, Lock, Crown, Compass, MapPin, ExternalLink, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '@/api/homieshub';

const FREE_LIMIT = 3;

// Two assistants behind one screen — a tab makes clear which AI you're talking to.
const BOTS = {
  homies: {
    key: 'homies',
    name: 'Homies AI',
    tag: 'Community & Knowledge',
    icon: Bot,
    accent: '#22d3ee', // cyan
    endpoint: '/ai/chat',
    bubbles: [
      'What is The Homies Hub?',
      'How do memberships work?',
      'What is Digital Nomad tier?',
      'Solo travel tips for Southeast Asia',
    ],
  },
  directorybro: {
    key: 'directorybro',
    name: 'DirectoryBro',
    tag: 'Trips · Flights · Planning',
    icon: Compass,
    accent: '#F0B94D', // gold
    endpoint: '/ai/directorybro/chat',
    bubbles: [
      'Cheapest flights to Cartagena?',
      'Plan a 5-day trip to Bangkok under $800',
      'Best nightlife in Medellín',
      'Hidden gems in Lisbon',
    ],
  },
};

const cutOffResponse = (text) => {
  const words = String(text || '').split(' ');
  const cut = Math.min(Math.ceil(words.length * 0.45), 40);
  return words.slice(0, cut).join(' ') + '...';
};

const UpgradeButton = ({ size = 'default' }) => (
  <Link to="/memberships">
    <Button
      size={size}
      className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold gap-2 shadow-[0_0_16px_rgba(240,185,77,0.4)]"
    >
      <Crown className="h-4 w-4" />
      Upgrade to Member
    </Button>
  </Link>
);

const greetingFor = (bot, user, isUnlimited) => {
  if (bot.key === 'directorybro') {
    return `Hey${user?.name ? ` ${user.name}` : ''} — I'm DirectoryBro. Tell me where you want to go and your budget, and I'll plan the trip, find flights, and surface the best-value spots.`;
  }
  return isUnlimited
    ? `What's good${user?.name ? ` ${user.name}` : ''}. Ask me anything about the community, memberships, or travel.`
    : user
      ? `What's good${user.name ? ` ${user.name}` : ''}. You have ${FREE_LIMIT} free questions — after that you'll need to upgrade.`
      : `What's good. You get ${FREE_LIMIT} free questions before you need to sign up. Ask me anything.`;
};

const MyAIPage = () => {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isUnlimited = !!isPremium;

  // Allow deep-linking straight to a bot: /AI?bot=directorybro
  const initialBot = BOTS[searchParams.get('bot')] ? searchParams.get('bot') : 'homies';
  const [activeBot, setActiveBot] = useState(initialBot);
  const bot = BOTS[activeBot];

  // Separate conversation per bot so switching tabs preserves each thread.
  const [threads, setThreads] = useState(() => ({
    homies: [{ id: 1, sender: 'ai', content: greetingFor(BOTS.homies, user, isUnlimited) }],
    directorybro: [{ id: 1, sender: 'ai', content: greetingFor(BOTS.directorybro, user, isUnlimited) }],
  }));
  const messages = threads[activeBot];
  const setMessages = (updater) =>
    setThreads(prev => ({ ...prev, [activeBot]: typeof updater === 'function' ? updater(prev[activeBot]) : updater }));

  // Free-question gating is shared across bots (non-members only).
  const [freeCount, setFreeCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [emailing, setEmailing] = useState(null);    // message id currently sending
  const [emailedIds, setEmailedIds] = useState({});  // id -> true once sent
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const emailTripPlan = async (msg) => {
    if (emailing || emailedIds[msg.id]) return;
    setEmailing(msg.id);
    try {
      await api.post('/ai/directorybro/email-trip', { plan: msg.content, places: msg.results || [] });
      setEmailedIds((prev) => ({ ...prev, [msg.id]: true }));
    } catch {
      /* surfaced inline by leaving the button enabled */
    } finally {
      setEmailing(null);
    }
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [threads, activeBot, isProcessing]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!text || isBlocked || isProcessing) return;

    const thread = threads[activeBot];
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', content: text }]);
    setInputValue('');
    setIsProcessing(true);

    try {
      let data;
      if (activeBot === 'directorybro') {
        // DirectoryBro expects history as [{ role, content }]
        const history = thread
          .filter(m => m.sender === 'user' || m.sender === 'ai')
          .slice(-6)
          .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content }));
        ({ data } = await api.post(bot.endpoint, { message: text, history }));
      } else {
        const history = thread
          .filter(m => m.sender === 'user' || m.sender === 'ai')
          .slice(-6)
          .map(m => `${m.sender === 'user' ? 'User' : 'Bot'}: ${m.content}`)
          .join('\n');
        ({ data } = await api.post(bot.endpoint, { message: text, history }));
      }

      const reply = data.reply;
      const results = Array.isArray(data.results) ? data.results : [];
      const newCount = freeCount + 1;

      if (!isUnlimited) {
        if (newCount >= FREE_LIMIT) {
          setMessages(prev => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', content: cutOffResponse(reply), results: [] },
            { id: Date.now() + 2, sender: 'system', type: 'wall' },
          ]);
          setIsBlocked(true);
        } else if (newCount === FREE_LIMIT - 1) {
          setMessages(prev => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', content: reply, results },
            { id: Date.now() + 2, sender: 'system', type: 'warning' },
          ]);
        } else {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', content: reply, results }]);
        }
        setFreeCount(newCount);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', content: reply, results }]);
      }
    } catch (err) {
      const limit = err?.response?.status === 402;
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai',
        content: limit ? "DirectoryBro's hit its daily limit — try again later." : "Couldn't reach the AI right now. Try again in a sec.",
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBubbleClick = (text) => {
    if (isBlocked) return;
    setInputValue(text);
    if (inputRef.current) inputRef.current.focus();
  };

  const renderPlaceResults = (results) => {
    if (!results?.length) return null;
    return (
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {results.slice(0, 4).map((p) => {
          const url = p?.data?.affiliate_url || p?.data?.url;
          return (
            <div key={p.id || p.name} className="rounded-xl bg-black/40 border border-white/10 p-3 text-left">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-white leading-tight">{p.name}</p>
                {p.verified && <span className="text-[9px] uppercase tracking-wide text-amber-300/80 shrink-0">verified</span>}
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {[p.type, p.city || p.location, p.country].filter(Boolean).join(' · ')}
              </p>
              {p?.data?.price_range && <p className="text-[11px] text-amber-300/90 mt-0.5">{p.data.price_range}</p>}
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300">
                  Book <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderMessage = (msg) => {
    if (msg.sender === 'system' && msg.type === 'warning') {
      return (
        <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
          <div className="max-w-sm w-full bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-3 text-center">
            <p className="text-amber-300 text-sm font-medium">
              Hey — you've got <span className="font-bold">1 free message left</span>. Consider upgrading to keep the conversation going.
            </p>
            <UpgradeButton size="sm" />
          </div>
        </motion.div>
      );
    }

    if (msg.sender === 'system' && msg.type === 'wall') {
      return (
        <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
          <div className="max-w-sm w-full bg-zinc-900 border border-amber-500/50 rounded-2xl p-6 flex flex-col items-center gap-4 text-center shadow-[0_0_30px_rgba(240,185,77,0.1)]">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Lock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-semibold mb-1">You've used your free questions</p>
              <p className="text-zinc-400 text-sm">Upgrade to a membership for unlimited AI access, exclusive content, and community perks.</p>
            </div>
            <UpgradeButton />
          </div>
        </motion.div>
      );
    }

    const Icon = bot.icon;
    return (
      <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={cn("flex gap-4", msg.sender === 'user' ? "flex-row-reverse" : "flex-row")}
      >
        <Avatar className="h-9 w-9 border border-white/10 shrink-0" style={{ background: msg.sender === 'ai' ? `${bot.accent}1a` : '#27272a' }}>
          {msg.sender === 'ai' ? <Icon className="h-5 w-5" style={{ color: bot.accent }} /> : <AvatarImage src={user?.avatar} />}
          <AvatarFallback>{msg.sender === 'ai' ? 'AI' : 'ME'}</AvatarFallback>
        </Avatar>
        <div className={cn(
          "p-4 rounded-2xl max-w-[85%] md:max-w-[70%] text-sm md:text-base leading-relaxed shadow-lg whitespace-pre-wrap",
          msg.sender === 'user' ? "text-white rounded-tr-none" : "bg-zinc-900 border border-white/10 text-zinc-100 rounded-tl-none"
        )} style={msg.sender === 'user' ? { background: bot.accent, color: '#0a0a0a' } : {}}>
          {msg.content}
          {msg.sender === 'ai' && renderPlaceResults(msg.results)}
          {msg.sender === 'ai' && activeBot === 'directorybro' && msg.content && msg.content.length > 160 && (
            <button
              onClick={() => emailTripPlan(msg)}
              disabled={emailing === msg.id || emailedIds[msg.id]}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors disabled:opacity-70"
              style={{ color: bot.accent, borderColor: `${bot.accent}55`, background: `${bot.accent}14` }}
            >
              {emailedIds[msg.id]
                ? (<><Check className="h-3.5 w-3.5" /> Emailed to you</>)
                : emailing === msg.id
                  ? (<><Mail className="h-3.5 w-3.5 animate-pulse" /> Sending…</>)
                  : (<><Mail className="h-3.5 w-3.5" /> Email me this plan</>)}
            </button>
          )}
          {msg.sender === 'ai' && !isUnlimited && freeCount >= FREE_LIMIT && (
            <div className="relative -mb-4 mt-2 h-6 bg-gradient-to-t from-zinc-900 to-transparent rounded-b-2xl pointer-events-none" />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] text-white overflow-hidden flex flex-col font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-black to-black z-0 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="font-bold tracking-wider text-sm">AI ASSISTANT</span>
          <span className="text-[10px] tracking-widest uppercase" style={{ color: `${bot.accent}b3` }}>{bot.tag}</span>
        </div>
        <div className="w-10" />
      </header>

      {/* Bot tabs */}
      <div className="relative z-10 flex justify-center gap-2 px-4 py-2 bg-black/30 border-b border-white/5 shrink-0">
        {Object.values(BOTS).map((b) => {
          const Icon = b.icon;
          const active = b.key === activeBot;
          return (
            <button
              key={b.key}
              onClick={() => setActiveBot(b.key)}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all",
                active ? "" : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20")}
              style={active ? { background: `${b.accent}1f`, borderColor: `${b.accent}66`, color: b.accent } : {}}
            >
              <Icon className="h-4 w-4" /> {b.name}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
          <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {messages.map(renderMessage)}

            {isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <Avatar className="h-9 w-9 border border-white/10" style={{ background: `${bot.accent}1a` }}>
                  <bot.icon className="h-5 w-5" style={{ color: bot.accent }} />
                </Avatar>
                <div className="flex gap-1 items-center h-12 px-5 bg-zinc-900 rounded-2xl rounded-tl-none border border-white/10">
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: bot.accent, animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: bot.accent, animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: bot.accent, animationDelay: '0.4s' }} />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Predictive bubbles */}
        {!isBlocked && (
          <div className="relative z-20 px-4 py-2 bg-gradient-to-t from-black via-black/90 to-transparent">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {bot.bubbles.map((text, i) => (
                <motion.button
                  key={`${activeBot}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleBubbleClick(text)}
                  className="whitespace-nowrap px-4 py-1.5 rounded-full bg-zinc-800/80 border border-white/10 text-xs md:text-sm text-zinc-100 hover:scale-105 transition-all flex items-center gap-2 shrink-0 backdrop-blur-sm"
                >
                  <Sparkles className="h-3 w-3" style={{ color: bot.accent }} />
                  {text}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-black border-t border-white/10">
          {isBlocked ? (
            <div className="max-w-3xl mx-auto flex items-center justify-center gap-4 py-1">
              <p className="text-zinc-500 text-sm">Free questions used up.</p>
              <UpgradeButton size="sm" />
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center gap-3">
              <Button
                type="button" size="icon" variant="ghost"
                className={cn("rounded-full h-12 w-12 shrink-0 transition-all duration-300 border border-transparent",
                  isListening ? "bg-red-500/20 text-red-500 border-red-500/50 animate-pulse" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700")}
                onClick={() => setIsListening(p => !p)}
              >
                {isListening ? <StopCircle className="h-6 w-6" /> : <Mic className="h-5 w-5" />}
              </Button>
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    activeBot === 'directorybro'
                      ? 'Where to? Add your budget and dates...'
                      : (!isUnlimited && freeCount > 0
                          ? `${FREE_LIMIT - freeCount} free message${FREE_LIMIT - freeCount === 1 ? '' : 's'} remaining...`
                          : 'Ask something or share what you know...')
                  }
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-2xl pl-4 pr-12 transition-all shadow-inner"
                />
                <Button
                  type="submit" size="icon" variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: bot.accent }}
                  disabled={!inputValue.trim() || isProcessing}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAIPage;
