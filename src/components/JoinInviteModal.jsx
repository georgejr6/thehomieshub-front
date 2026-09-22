import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Soft, dismissible nudge toward /join — shown (throttled, see App.jsx) to
// logged-out visitors who are already browsing freely (location verified).
// Never blocks anything; closing it just closes it.
export default function JoinInviteModal({ onClose }) {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-neutral-900/95 shadow-2xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-extrabold text-white mb-1.5">Enjoying The Homies Hub?</h3>
          <p className="text-white/60 text-sm mb-5 leading-relaxed">
            Join the community to unlock chat, exclusive content, and connect with the crew. Takes less than a minute.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => { onClose(); navigate('/join'); }} className="flex-1 font-bold">
              Join now
            </Button>
            <Button variant="ghost" onClick={onClose} className="text-white/50 hover:text-white hover:bg-white/5">
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
