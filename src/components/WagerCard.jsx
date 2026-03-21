import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Swords, Trophy, Zap, UserCheck, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import USDInfoBadge from '@/components/USDInfoBadge';

const TYPE_CONFIG = {
  CONTENT_BATTLE: { label: 'Content Battle', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', icon: Zap },
  SOCIAL:         { label: 'Social Bet',     color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Users },
  EVENT:          { label: 'Event',          color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: Trophy },
  DUEL:           { label: 'Duel',           color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     icon: Swords },
};

const STATUS_CONFIG = {
  OPEN:     { label: 'Open',     dot: 'bg-green-400' },
  ACTIVE:   { label: 'Active',   dot: 'bg-yellow-400' },
  RESOLVED: { label: 'Settled',  dot: 'bg-primary' },
  EXPIRED:  { label: 'Expired',  dot: 'bg-red-400' },
  DISPUTED: { label: 'Disputed', dot: 'bg-orange-400' },
};

const timeLeft = (expiresAt) => {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const WagerCard = ({ wager, index = 0 }) => {
  const navigate = useNavigate();
  const type   = TYPE_CONFIG[wager.type]   || TYPE_CONFIG.SOCIAL;
  const status = STATUS_CONFIG[wager.status] || STATUS_CONFIG.OPEN;
  const TypeIcon = type.icon;
  const isOpen     = wager.status === 'OPEN';
  const isResolved = wager.status === 'RESOLVED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={() => navigate(`/wagers/${wager._id}`)}
      className="group relative bg-zinc-900 border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-primary/40 transition-all duration-200 flex flex-col gap-3"
    >
      {/* Top row: badges left, pot right */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border', type.bg, type.color)}>
            <TypeIcon className="h-3 w-3" />
            {type.label}
          </span>
          {wager.bettingMode && (
            <span className={cn(
              'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              wager.bettingMode === 'P2P'
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            )}>
              {wager.bettingMode === 'P2P'
                ? <><UserCheck className="h-3 w-3" /> P2P</>
                : <><BarChart3 className="h-3 w-3" /> Pool</>}
            </span>
          )}
        </div>

        <div className="text-right shrink-0">
          <USDInfoBadge amount={wager.totalPot} size="sm" className="text-primary" />
          <div className="text-[10px] text-muted-foreground mt-0.5">pot</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2 group-hover:text-primary/90 transition-colors">
        {wager.title}
      </h3>

      {/* Footer: meta + action */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {/* Status dot */}
          <span className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
            {status.label}
          </span>
          {/* Time */}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeLeft(wager.expiresAt)}
          </span>
          {/* Participant count */}
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {wager.participants?.length || 0}
          </span>
        </div>

        {isOpen && (
          <Button
            size="sm"
            className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary hover:text-black border border-primary/30 transition-all px-3"
            onClick={(e) => { e.stopPropagation(); navigate(`/wagers/${wager._id}`); }}
          >
            Join
          </Button>
        )}
        {isResolved && (
          <span className="text-[10px] text-primary flex items-center gap-1 font-medium">
            <CheckCircle2 className="h-3 w-3" /> Settled
          </span>
        )}
      </div>

      {/* Creator */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
        <div className="h-3.5 w-3.5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[7px] font-bold">
          {wager.creator?.username?.[0]?.toUpperCase() || '?'}
        </div>
        @{wager.creator?.username}
      </div>
    </motion.div>
  );
};

export default WagerCard;
