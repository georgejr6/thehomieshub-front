import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Swords, Trophy, Users, Zap, TrendingUp, Clock, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import WagerCard from '@/components/WagerCard';
import CreateWagerModal from '@/components/CreateWagerModal';
import { useWager } from '@/contexts/WagerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: TrendingUp },
  { id: 'CONTENT_BATTLE', label: 'Content Battles', icon: Zap },
  { id: 'SOCIAL', label: 'Social Bets', icon: Users },
  { id: 'EVENT', label: 'Events', icon: Trophy },
  { id: 'DUEL', label: 'Duels', icon: Swords },
];

const STATUS_FILTERS = ['All', 'Open', 'Active', 'Resolved'];

const WagersPage = ({ onLoginRequest }) => {
  const [activeType, setActiveType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { wagers, loadingWagers, fetchWagers } = useWager();
  const { user } = useAuth();
  const { connectedWallet } = useWallet();

  useEffect(() => {
    fetchWagers();
  }, [fetchWagers]);

  const filtered = wagers.filter((w) => {
    const typeMatch = activeType === 'all' || w.type === activeType;
    const statusMatch = activeStatus === 'All' || w.status === activeStatus.toUpperCase();
    return typeMatch && statusMatch;
  });

  const totalPot = wagers.filter((w) => w.status === 'OPEN' || w.status === 'ACTIVE')
    .reduce((sum, w) => sum + (w.totalPot || 0), 0);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero banner */}
      <div className="relative bg-zinc-950 border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-48 bg-primary/5 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-blue-500/5 rounded-full blur-[60px]" />
        </div>
        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mb-2"
              >
                <Swords className="h-7 w-7 text-primary" />
                <h1 className="text-3xl font-bold text-white tracking-tight">Wagers</h1>
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="text-muted-foreground text-sm"
              >
                Bet real dollars on real outcomes. Funds held in Algorand escrow — no platform holds your money.
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4 mt-3 text-sm"
              >
                <span className="flex items-center gap-1.5 text-primary font-bold">
                  <TrendingUp className="h-4 w-4" />
                  ${totalPot.toFixed(2)} USD live
                </span>
                <span className="text-muted-foreground">
                  {wagers.filter((w) => w.status === 'OPEN').length} open wagers
                </span>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              {user ? (
                <>
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-primary text-black hover:bg-primary/90 font-bold h-11 px-6 gap-2 shadow-[0_0_20px_rgba(240,185,77,0.2)]"
                  >
                    <Plus className="h-5 w-5" />
                    Create Wager
                  </Button>
                  {!connectedWallet && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">Connect wallet first</p>
                  )}
                </>
              ) : (
                <Button
                  onClick={onLoginRequest}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5 h-11 px-6 gap-2"
                >
                  <LogIn className="h-5 w-5" />
                  Sign in to wager
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-14 z-20 bg-black/90 backdrop-blur-md border-b border-white/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Type filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 flex-1">
            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveType(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                    activeType === tab.id
                      ? 'bg-primary text-black'
                      : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 shrink-0">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  activeStatus === s
                    ? 'bg-white/20 text-white'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loadingWagers ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 p-5 rounded-2xl border border-white/10 bg-zinc-900">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-7 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Swords className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <p className="text-muted-foreground">No wagers found.</p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/5">
              Create the first one
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((wager, i) => (
              <WagerCard key={wager._id} wager={wager} index={i} />
            ))}
          </div>
        )}
      </div>

      <CreateWagerModal isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
};

export default WagersPage;
