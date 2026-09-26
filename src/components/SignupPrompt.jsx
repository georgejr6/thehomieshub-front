import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Music2, Play, UserPlus, LogIn, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// One bottom sheet for every "preview ended" moment (8s video teaser, 60s
// sample, 30s song preview). Anything can open it:
//   window.dispatchEvent(new CustomEvent('hh:signup-prompt', { detail: {
//     kind: 'video' | 'music', title, cover, redirect: '/watch/<id>' } }))
// Signed out → free sign-up / sign-in, and after auth they land back on
// `redirect` (App.jsx post_auth_redirect). Signed in (free) → membership.
export const openSignupPrompt = (detail) => window.dispatchEvent(new CustomEvent('hh:signup-prompt', { detail }));

export default function SignupPrompt({ onLoginRequest }) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const on = (e) => setPrompt(e.detail || {});
    window.addEventListener('hh:signup-prompt', on);
    return () => window.removeEventListener('hh:signup-prompt', on);
  }, []);

  // Signing in from the sheet closes it.
  useEffect(() => { if (user && prompt && !prompt.members) setPrompt(null); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => setPrompt(null);
  const auth = (tab) => { const redirect = prompt?.redirect; close(); onLoginRequest?.({ tab, redirect }); };
  const isMusic = prompt?.kind === 'music';
  const members = !!user; // a signed-in viewer only sees this for members-only videos

  return (
    <AnimatePresence>
      {prompt && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="signup-prompt-title"
            className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-[#111] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center sm:rounded-3xl"
            initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={close} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

            {prompt.cover ? (
              <img src={prompt.cover} alt="" className={`mx-auto mb-4 h-24 object-cover shadow-lg ${isMusic ? 'w-24 rounded-2xl' : 'w-40 rounded-xl'}`} />
            ) : (
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0B94D]/15">
                {isMusic ? <Music2 className="h-8 w-8 text-[#F0B94D]" /> : <Play className="h-8 w-8 text-[#F0B94D]" />}
              </div>
            )}
            {prompt.title && <p className="mb-1 line-clamp-1 text-sm text-white/60">{prompt.title}</p>}

            {members ? (
              <>
                <h2 id="signup-prompt-title" className="text-2xl font-extrabold text-white">Watch the full video</h2>
                <p className="mt-2 text-sm text-white/60">Full-length videos are for Homies members. Music, posts and the short feed stay free.</p>
                <Link to="/memberships" onClick={close} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F0B94D] py-3.5 text-base font-bold text-black active:scale-[0.99]">
                  <Crown className="h-5 w-5" /> Become a member
                </Link>
                <button type="button" onClick={close} className="mt-3 w-full py-2 text-sm font-semibold text-white/60 hover:text-white">Keep scrolling</button>
              </>
            ) : (
              <>
                <h2 id="signup-prompt-title" className="text-2xl font-extrabold text-white">{isMusic ? 'Keep listening' : 'Keep watching'}</h2>
                <p className="mt-2 text-sm text-white/60">
                  {isMusic ? 'Create a free account to hear the whole song, save it and comment.' : 'Create a free account to keep scrolling the feed, like and comment.'} It takes a few seconds.
                </p>
                <button type="button" onClick={() => auth('signup')} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F0B94D] py-3.5 text-base font-bold text-black active:scale-[0.99]">
                  <UserPlus className="h-5 w-5" /> Sign up free
                </button>
                <button type="button" onClick={() => auth('signin')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15">
                  <LogIn className="h-4 w-4" /> I already have an account
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
