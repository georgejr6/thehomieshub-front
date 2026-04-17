import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Bot, Sparkles, ChevronLeft, StopCircle, HelpCircle, ArrowRight, Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/api/homieshub';

const FREE_LIMIT = 3;

const cutOffResponse = (text) => {
  const words = text.split(' ');
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

const AIPageHeader = ({ onBack }) => (
  <header className="relative z-10 flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
    <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10" onClick={onBack}>
      <ChevronLeft className="h-6 w-6" />
    </Button>
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-cyan-400" />
        <span className="font-bold tracking-wider text-sm">AI ASSISTANT</span>
      </div>
      <span className="text-[10px] text-cyan-300/70 tracking-widest uppercase">Knowledge & Directory</span>
    </div>
    <div className="w-10" />
  </header>
);

const MyAIPage = () => {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const isUnlimited = !!isPremium;

  const initialGreeting = isUnlimited
    ? `What's good${user?.name ? ` ${user.name}` : ''}. Ask me anything about the community, memberships, or travel.`
    : user
      ? `What's good${user.name ? ` ${user.name}` : ''}. You have ${FREE_LIMIT} free questions — after that you'll need to upgrade.`
      : `What's good. You get ${FREE_LIMIT} free questions before you need to sign up. Ask me anything.`;

  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', content: initialGreeting }
  ]);
  const [freeCount, setFreeCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = inputValue.trim();
    if (!text || isBlocked) return;

    const userMsg = { id: Date.now(), sender: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    try {
      const recentHistory = messages
        .filter(m => m.sender === 'user' || m.sender === 'ai')
        .slice(-6)
        .map(m => `${m.sender === 'user' ? 'User' : 'Bot'}: ${m.content}`)
        .join('\n');

      const { data } = await api.post('/ai/chat', { message: text, history: recentHistory });
      const newCount = freeCount + 1;

      if (!isUnlimited) {
        if (newCount >= FREE_LIMIT) {
          // 3rd response — cut off and hard block
          const cut = cutOffResponse(data.reply);
          setMessages(prev => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', content: cut },
            { id: Date.now() + 2, sender: 'system', type: 'wall' },
          ]);
          setIsBlocked(true);
        } else if (newCount === FREE_LIMIT - 1) {
          // 2nd response — warn
          setMessages(prev => [
            ...prev,
            { id: Date.now() + 1, sender: 'ai', content: data.reply },
            { id: Date.now() + 2, sender: 'system', type: 'warning' },
          ]);
        } else {
          setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', content: data.reply }]);
        }
        setFreeCount(newCount);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', content: "Couldn't reach the AI right now. Try again in a sec." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const predictiveBubbles = [
    "Best nightlife in Medellin?",
    "What is The Homies Hub?",
    "How do memberships work?",
    "Solo travel tips for Southeast Asia",
    "Hidden gems in Thailand",
    "What is Digital Nomad tier?",
  ];

  const faqs = [
    { q: "What can I ask the AI?", a: "Community info, membership tiers, travel knowledge, and Homies-contributed tips." },
    { q: "What membership tiers are available?", a: "The Homies ($15/mo), The Homies ($100/yr), and Digital Nomad ($100/mo)." },
    { q: "How do I contribute to the knowledge base?", a: "Share travel tips, local spots, or experiences — the community grows with you." },
    { q: "Is it safe to travel solo in Brazil?", a: "Ask me — I'll give you the real talk based on community knowledge." },
  ];

  const handleBubbleClick = (text) => {
    if (isBlocked) return;
    setInputValue(text);
    if (inputRef.current) inputRef.current.focus();
  };

  const renderMessage = (msg) => {
    if (msg.sender === 'system' && msg.type === 'warning') {
      return (
        <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
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
        <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center"
        >
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

    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("flex gap-4", msg.sender === 'user' ? "flex-row-reverse" : "flex-row")}
      >
        <Avatar className={cn("h-9 w-9 border border-white/10 shrink-0", msg.sender === 'ai' ? "bg-cyan-950" : "bg-zinc-800")}>
          {msg.sender === 'ai' ? <Bot className="h-5 w-5 text-cyan-400" /> : <AvatarImage src={user?.avatar} />}
          <AvatarFallback>{msg.sender === 'ai' ? 'AI' : 'ME'}</AvatarFallback>
        </Avatar>
        <div className={cn(
          "p-4 rounded-2xl max-w-[85%] md:max-w-[70%] text-sm md:text-base leading-relaxed shadow-lg",
          msg.sender === 'user'
            ? "bg-cyan-600 text-white rounded-tr-none"
            : "bg-zinc-900 border border-white/10 text-zinc-100 rounded-tl-none"
        )}>
          {msg.content}
          {/* Cut-off fade overlay on the last AI msg before wall */}
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

      <AIPageHeader onBack={() => navigate(-1)} />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 px-4 py-6">
          <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {messages.length < 3 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10"
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-cyan-400">
                  <HelpCircle className="h-5 w-5" /> Ask or Contribute
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {faqs.map((faq, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleBubbleClick(faq.q)}
                      disabled={isBlocked}
                      className="text-left p-3 rounded-xl bg-black/40 hover:bg-cyan-900/20 border border-white/5 hover:border-cyan-500/30 transition-all group disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <p className="text-sm font-medium text-white group-hover:text-cyan-300">{faq.q}</p>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{faq.a}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map(renderMessage)}

            {isProcessing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <Avatar className="h-9 w-9 bg-cyan-950 border border-white/10">
                  <Bot className="h-5 w-5 text-cyan-400" />
                </Avatar>
                <div className="flex gap-1 items-center h-12 px-5 bg-zinc-900 rounded-2xl rounded-tl-none border border-white/10">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Predictive bubbles — hide when blocked */}
        {!isBlocked && (
          <div className="relative z-20 px-4 py-2 bg-gradient-to-t from-black via-black/90 to-transparent">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {predictiveBubbles.map((text, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleBubbleClick(text)}
                  className="whitespace-nowrap px-4 py-1.5 rounded-full bg-zinc-800/80 border border-white/10 text-xs md:text-sm text-cyan-100 hover:bg-cyan-900/50 hover:border-cyan-500/50 hover:scale-105 transition-all flex items-center gap-2 shrink-0 backdrop-blur-sm"
                >
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  {text}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 bg-black border-t border-white/10">
          {isBlocked ? (
            <div className="max-w-3xl mx-auto flex items-center justify-center gap-4 py-1">
              <p className="text-zinc-500 text-sm">Free questions used up.</p>
              <UpgradeButton size="sm" />
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  "rounded-full h-12 w-12 shrink-0 transition-all duration-300 border border-transparent",
                  isListening ? "bg-red-500/20 text-red-500 border-red-500/50 animate-pulse" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                )}
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
                    !isUnlimited && freeCount > 0
                      ? `${FREE_LIMIT - freeCount} free message${FREE_LIMIT - freeCount === 1 ? '' : 's'} remaining...`
                      : "Ask something or share what you know..."
                  }
                  className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-500 h-12 rounded-2xl pl-4 pr-12 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500/50 transition-all shadow-inner"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
