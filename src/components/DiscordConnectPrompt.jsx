import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import api from '@/api/homieshub';
import { useToast } from '@/components/ui/use-toast';

const STORAGE_KEY = 'hh_discord_prompt';

export function shouldShowDiscordPrompt(user) {
  if (!user || user.discordUsername) return false;
  return localStorage.getItem(STORAGE_KEY) !== 'never';
}

export default function DiscordConnectPrompt({ open, onDismiss }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/discord/connect');
      window.location.href = data.result.url;
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to start Discord connection.', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleNotNow = () => {
    // Suppress until page reload — no localStorage write
    onDismiss();
  };

  const handleNever = () => {
    localStorage.setItem(STORAGE_KEY, 'never');
    onDismiss();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[500] flex justify-center pointer-events-none px-4 pb-6 md:pb-8">
      <div
        className="pointer-events-auto w-full max-w-md bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 0 40px rgba(88,101,242,0.15)' }}
      >
        {/* Dismiss X */}
        <button
          onClick={handleNotNow}
          className="absolute top-3 right-3 text-white/30 hover:text-white/70 p-1 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 p-5">
          {/* Discord logo */}
          <div className="w-11 h-11 rounded-xl bg-[#5865F2] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="white">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <p className="text-white font-bold text-sm leading-tight">Connect your Discord account</p>
            <p className="text-white/50 text-xs mt-1 leading-snug">
              Link Discord to unlock server perks, verify your membership, and let the community find you.
            </p>

            <div className="flex items-center gap-2 mt-4">
              <Button
                size="sm"
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold h-9 px-4 flex-shrink-0"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Connect Discord
              </Button>
              <button
                onClick={handleNotNow}
                className="text-xs text-white/40 hover:text-white/70 transition-colors px-1 py-1 flex-shrink-0"
              >
                Not now
              </button>
              <button
                onClick={handleNever}
                className="text-xs text-white/25 hover:text-white/50 transition-colors px-1 py-1 flex-shrink-0 ml-auto"
              >
                Never show
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
