import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, Play, Compass, Radio, Library, Music, ShoppingBag, MapPin, Clapperboard,
  Crown, Wallet, Package, Bot, LayoutGrid, ShieldCheck, ChevronsRight, ChevronsLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatures } from '@/contexts/FeatureContext';

// The app's sidebar, inside Homies Chat's server rail (the column under the
// server icon) — so chat isn't a dead end. Collapsed = Discord-style round
// icons with tooltips; expanded = the rail slides wider and shows the labels,
// pushing the chat over. Mirrors components/Sidebar.jsx's groups.
const STORAGE_KEY = 'hh_chat_rail_open';

export const readRailOpen = () => { try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; } };
export const saveRailOpen = (open) => { try { localStorage.setItem(STORAGE_KEY, open ? '1' : '0'); } catch { /* private window */ } };

function RailLink({ to, icon: Icon, label, expanded, onNavigate, accent }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      title={expanded ? undefined : label}
      className={({ isActive }) => cn(
        'group flex h-11 shrink-0 items-center rounded-2xl transition-all duration-200',
        expanded ? 'w-full gap-3 px-3' : 'w-11 justify-center hover:rounded-xl',
        isActive ? 'bg-[#5865F2] text-white' : 'bg-[#313338] text-[#DBDEE1] hover:bg-[#5865F2] hover:text-white',
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', accent)} />
      <span className={cn('truncate whitespace-nowrap text-sm font-medium transition-opacity duration-200', expanded ? 'opacity-100' : 'sr-only')}>
        {label}
      </span>
    </NavLink>
  );
}

const Divider = () => <div className="mx-auto my-1 h-0.5 w-8 shrink-0 rounded bg-[#35363C]" />;

export default function ChatAppRail({ expanded, onToggle, onNavigate }) {
  const { user } = useAuth();
  const { checkAccess } = useFeatures();
  const visible = (item) => !item.featureKey || checkAccess(item.featureKey).status !== 'hidden';

  const groups = [
    [
      { to: '/', icon: Home, label: 'Home' },
      { to: '/browse', icon: Play, label: 'Browse' },
      { to: '/explore', icon: Compass, label: 'Explore', featureKey: 'explore' },
      { to: '/live', icon: Radio, label: 'Live', featureKey: 'live_streaming' },
      { to: '/library', icon: Library, label: 'Library', featureKey: 'library' },
      { to: '/media', icon: Music, label: 'Media Mode' },
    ],
    [
      { to: '/marketplace', icon: ShoppingBag, label: 'Marketplace' },
      ...(user ? [{ to: '/trips', icon: MapPin, label: 'Trips' }] : []),
      ...(user ? [{ to: '/creator-studio', icon: Clapperboard, label: 'Creator Studio' }] : []),
    ],
    [
      { to: '/memberships', icon: Crown, label: 'Memberships', accent: 'text-[#F0B94D]' },
      ...(user ? [{ to: '/wallet', icon: Wallet, label: 'Wallet' }] : []),
      ...(user ? [{ to: '/purchases', icon: Package, label: 'Purchases' }] : []),
      { to: '/AI', icon: Bot, label: 'AI', featureKey: 'my_ai' },
      { to: '/my-apps', icon: LayoutGrid, label: 'My Apps' },
      ...(user?.isAdmin ? [{ to: '/admin/dashboard', icon: ShieldCheck, label: 'Admin' }] : []),
    ],
  ].map((g) => g.filter(visible)).filter((g) => g.length);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <nav aria-label="The Homies app" className={cn('no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-2', expanded ? 'px-3' : 'items-center')}>
        {groups.map((items, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <Divider />}
            {items.map((item) => <RailLink key={item.to} {...item} expanded={expanded} onNavigate={onNavigate} />)}
          </React.Fragment>
        ))}
      </nav>
      <button
        type="button"
        onClick={onToggle}
        title={expanded ? 'Collapse menu' : 'Show menu names'}
        aria-label={expanded ? 'Collapse menu' : 'Show menu names'}
        aria-expanded={expanded}
        className={cn('mx-auto mt-1 flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl text-[#B5BAC1] transition-colors hover:bg-[#313338] hover:text-white', expanded ? 'w-[calc(100%-1.5rem)] px-3' : 'w-11')}
      >
        {expanded ? <><ChevronsLeft className="h-5 w-5" /><span className="text-xs font-medium">Collapse</span></> : <ChevronsRight className="h-5 w-5" />}
      </button>
    </div>
  );
}
