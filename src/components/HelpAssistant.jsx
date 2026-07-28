import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Search, Lock, X, Loader2, ArrowRight, Compass } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api from '@/api/homieshub';

const TYPE_ICON = {
  page: Compass,
  profile: Search,
  video: Search,
  reel: Search,
  trip: Search,
  event: Search,
  poll: Search,
  post: Search,
};

// Floating "?" navigator. Type what you want → AI returns direct links to pages
// AND content (profiles, videos, trips). Click a result to jump there.
const HelpAssistant = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [links, setLinks] = useState([]);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setTouched(true);
    try {
      const { data } = await api.post('/ai/navigate', { query: q });
      setAnswer(data?.answer || '');
      setLinks(Array.isArray(data?.links) ? data.links : []);
    } catch {
      setAnswer("Something went wrong — try again.");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const go = (path) => {
    setOpen(false);
    if (path) navigate(path);
  };

  return (
    <>
      {/* Floating trigger — bottom-right, clears the mobile bottom nav */}
      <button
        aria-label="Help & navigate"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-20 md:bottom-6 right-4 z-[70] h-11 w-11 rounded-full flex items-center justify-center',
          'bg-primary text-primary-foreground shadow-lg shadow-primary/30',
          'hover:scale-105 active:scale-95 transition-transform',
          'ring-2 ring-primary/40 animate-pulse',
        )}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-[65]" onClick={() => setOpen(false)} />

          <div className="fixed bottom-36 md:bottom-24 right-4 z-[70] w-[min(92vw,360px)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="p-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground mb-2">Where do you want to go?</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                    placeholder="e.g. memberships, Medellín trips, music…"
                    className="pl-8 h-9"
                  />
                </div>
                <button
                  onClick={runSearch}
                  disabled={loading || !query.trim()}
                  className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
                </button>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {answer && <p className="px-3 pt-3 text-xs text-muted-foreground">{answer}</p>}

              {touched && !loading && links.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No matches — try a different word.</p>
              )}

              <ul className="p-2 space-y-1">
                {links.map((l, i) => {
                  const Icon = TYPE_ICON[l.type] || Compass;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => go(l.path)}
                        className="w-full flex items-center gap-3 text-left p-2.5 rounded-lg hover:bg-muted transition-colors group"
                      >
                        <span className="h-8 w-8 shrink-0 rounded-md bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">{l.label}</span>
                            {l.locked && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                                <Lock className="h-3 w-3" /> Members
                              </span>
                            )}
                          </span>
                          {l.sublabel && <span className="block text-xs text-muted-foreground truncate">{l.sublabel}</span>}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>

              {!touched && (
                <p className="px-3 pb-3 text-xs text-muted-foreground">
                  Ask for a page, a creator, a video, or a place — I'll take you straight there.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default HelpAssistant;
