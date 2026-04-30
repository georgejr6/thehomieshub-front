import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, ShoppingCart, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMedia } from '@/contexts/MediaContext';
import { useAuth } from '@/contexts/AuthContext';

const VideoPurchaseGate = () => {
  const { gatedVideo, setGatedVideo, purchaseVideo } = useMedia();
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!gatedVideo) return;
    setPurchasing(true);
    const videoId = gatedVideo.id || gatedVideo._id;
    const videoType = gatedVideo.backendType || 'video';
    // purchaseVideo redirects to Stripe — no need to reset state
    await purchaseVideo(videoId, videoType);
    setPurchasing(false);
  };

  const handleMembership = () => {
    setGatedVideo(null);
    window.open('https://www.thehomies.app/memberships', '_blank');
  };

  const handleLogin = () => {
    setGatedVideo(null);
    // Navigate back to main app so auth modal can open
    window.location.href = '/';
  };

  return (
    <AnimatePresence>
      {gatedVideo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/85 flex items-end md:items-center justify-center p-4"
          onClick={() => setGatedVideo(null)}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Thumbnail banner */}
            {(gatedVideo.cover || gatedVideo.backdropUrl) && (
              <div className="relative w-full aspect-video overflow-hidden">
                <img
                  src={gatedVideo.backdropUrl || gatedVideo.cover}
                  alt={gatedVideo.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-black/40 to-transparent" />
                <button
                  onClick={() => setGatedVideo(null)}
                  className="absolute top-3 right-3 text-white/60 hover:text-white bg-black/50 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="p-6">
              {/* Title */}
              <h2 className="text-xl font-black text-white mb-1 line-clamp-2">
                {gatedVideo.title || 'Members Only'}
              </h2>
              <p className="text-zinc-400 text-sm mb-6">
                This video is available to members and individual purchasers.
              </p>

              {!user ? (
                /* Not logged in */
                <>
                  <Button
                    onClick={handleLogin}
                    className="w-full bg-white text-black hover:bg-white/90 font-bold gap-2 mb-3"
                  >
                    <LogIn className="w-4 h-4" /> Sign In to Watch
                  </Button>
                  <p className="text-zinc-500 text-xs text-center">
                    Already have access? Sign in to unlock.
                  </p>
                </>
              ) : (
                /* Logged in, no subscription */
                <div className="space-y-3">
                  {/* Buy this video */}
                  <Button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold gap-2 py-5"
                  >
                    {purchasing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…</>
                      : <><ShoppingCart className="w-4 h-4" /> Buy this video — $4.99</>
                    }
                  </Button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 text-zinc-600 text-xs">
                    <div className="flex-1 h-px bg-zinc-800" />
                    or
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>

                  {/* Become a member */}
                  <Button
                    onClick={handleMembership}
                    variant="outline"
                    className="w-full border-zinc-700 text-white hover:bg-zinc-800 font-semibold gap-2"
                  >
                    <Crown className="w-4 h-4 text-yellow-400" /> Become a Member — Unlimited Access
                  </Button>

                  <p className="text-zinc-600 text-xs text-center pt-1">
                    Members watch everything. Individual purchases unlock one video permanently.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoPurchaseGate;
