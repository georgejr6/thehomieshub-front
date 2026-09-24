import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Crown, Film, Plane, Music2, MessagesSquare, CalendarDays, Sparkles, RefreshCw, LogOut, Ban, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Members-only lock (server: middleware/memberGate.js, CONTENT_REQUIRE_MEMBERSHIP).
// Signed-in accounts without a paid membership see this screen instead of
// any content page. The server refuses the content anyway (402), so this is
// the friendly face of that — every path leads to /memberships.

// Pages a non-member can still use: pay, join, account, legal, chat (its own gate).
const OPEN_PREFIXES = ['/memberships', '/join', '/settings', '/wallet', '/chat', '/appeal', '/pay', '/auth', '/admin', '/terms', '/privacy', '/community-guidelines', '/child-safety', '/support'];
const isOpenPath = (path) => path === '/' || OPEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

// Logged-out visitors see only these (everything else → sign-in screen).
const PUBLIC_PREFIXES = ['/join', '/memberships', '/chat', '/auth', '/admin/login', '/pay', '/appeal', '/terms', '/privacy', '/community-guidelines', '/child-safety', '/support'];
const isPublicPath = (path) => path === '/' || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

// Discord invite goes through /join (the verification gate) — never a raw invite.
const DISCORD_PATH = '/join';

export const isMemberUser = (user) => !!user && (user.isAdmin || (user.effectiveTier && user.effectiveTier !== 'none'));

const PERKS = [
  { icon: Film, title: 'Every video & reel', text: 'The full library — nights out, travel, the real stories.' },
  { icon: Plane, title: 'Trips & travel guides', text: 'Where we go, where we stay, how to do it right.' },
  { icon: MessagesSquare, title: 'All of the chat', text: 'Every channel, links, photos and DMs with the homies.' },
  { icon: Music2, title: 'Music', text: 'The whole catalog, playlists and new drops.' },
  { icon: CalendarDays, title: 'Events & meetups', text: 'First to know, first in.' },
];

export function MembershipWall() {
  const { user, refreshMe } = useAuth();
  const [checking, setChecking] = useState(false);
  const admitted = !!user?.gate?.admittedAt;
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0B94D]/15">
          <Lock className="h-8 w-8 text-[#F0B94D]" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold text-white sm:text-4xl">Members only</h1>
        <p className="mt-2 text-base text-muted-foreground">Everything in The Homies is for members. Join to unlock it all.</p>

        <div className="mt-6 space-y-2 text-left">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#F0B94D]" />
              <div>
                <div className="font-semibold text-white">{title}</div>
                <div className="text-sm text-muted-foreground">{text}</div>
              </div>
            </div>
          ))}
        </div>

        <Link to="/memberships" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F0B94D] py-3.5 text-lg font-bold text-black transition-transform hover:scale-[1.01] active:scale-[0.99]">
          <Crown className="h-5 w-5" /> Become a member
        </Link>

        {/* Not paying yet? Hang out with the community in the meantime. */}
        <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Not ready yet? Hang with the homies</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Link to="/chat" className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-white transition-colors hover:bg-white/10">
            <MessagesSquare className="h-5 w-5 text-[#F0B94D]" /> Open Homies Chat
          </Link>
          <Link to={DISCORD_PATH} className="flex items-center justify-center gap-2 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/15 py-3 font-semibold text-white transition-colors hover:bg-[#5865F2]/25">
            <UserPlus className="h-5 w-5 text-[#8B95F9]" /> {admitted ? 'Go to the Discord' : 'Join the Discord'}
          </Link>
        </div>
        {!admitted && <p className="mt-2 text-xs text-muted-foreground">Chat and Discord open after the quick join steps (verify email + location).</p>}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          <Link to="/chat" className="flex items-center gap-1.5 text-muted-foreground hover:text-white"><Sparkles className="h-4 w-4" />Got Homies Points? Redeem membership in chat</Link>
          <button
            type="button"
            disabled={checking}
            onClick={async () => { setChecking(true); try { await refreshMe(); } finally { setChecking(false); } }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />Already paid? Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

/** Logged-out visitors: nothing but this. */
export function SignInWall({ onLoginRequest }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0B94D]/15">
          <Lock className="h-8 w-8 text-[#F0B94D]" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold text-white">Sign in to The Homies</h1>
        <p className="mt-2 text-muted-foreground">Everything here is for verified homies. Sign in, or join the community to get started.</p>
        <button type="button" onClick={onLoginRequest} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F0B94D] py-3.5 text-lg font-bold text-black transition-transform hover:scale-[1.01] active:scale-[0.99]">
          <LogIn className="h-5 w-5" /> Sign in
        </button>
        <Link to={DISCORD_PATH} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/15 py-3 font-semibold text-white transition-colors hover:bg-[#5865F2]/25">
          <UserPlus className="h-5 w-5 text-[#8B95F9]" /> New here? Join the community
        </Link>
        <Link to="/memberships" className="mt-3 inline-block text-sm text-muted-foreground hover:text-white">See memberships</Link>
      </div>
    </div>
  );
}

/**
 * Wraps page content: non-members on a locked page get the wall. Also flips
 * on when the server answers 402 (e.g. the lock was switched on mid-session).
 */
export function MembershipGate({ children, full = false, onLoginRequest }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [serverSaysLocked, setServerSaysLocked] = useState(() => !!window.__hhMembershipRequired);
  useEffect(() => {
    const on = () => setServerSaysLocked(true);
    window.addEventListener('hh:membership-required', on);
    return () => window.removeEventListener('hh:membership-required', on);
  }, []);
  useEffect(() => { if (isMemberUser(user)) { window.__hhMembershipRequired = false; setServerSaysLocked(false); } }, [user]);

  // Not signed in → only the public pages (landing, join, memberships, chat's own sign-in, legal).
  const token = (() => { try { return localStorage.getItem('access_token'); } catch { return null; } })();
  if (!loading && !user && !isPublicPath(location.pathname)) return <SignInWall onLoginRequest={onLoginRequest} />;
  if (loading && token && !isPublicPath(location.pathname)) return null; // don't flash content or the wall while checking the session

  const locked = !!user && !isMemberUser(user) && (user.contentRequiresMembership || serverSaysLocked) && !isOpenPath(location.pathname);
  if (!locked) return children;
  return full ? <div className="min-h-screen bg-background text-foreground"><MembershipWall /></div> : <MembershipWall />;
}

/** Banned accounts see nothing but this. */
export function BannedScreen() {
  const { user, signOut } = useAuth();
  const [banned, setBanned] = useState(() => !!window.__hhAccountBanned);
  useEffect(() => {
    const on = () => setBanned(true);
    window.addEventListener('hh:account-banned', on);
    return () => window.removeEventListener('hh:account-banned', on);
  }, []);
  if (!banned && !user?.isBanned) return null;
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black px-6 text-center">
      <div className="max-w-sm">
        <Ban className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-2xl font-bold text-white">This account has been banned</h1>
        <p className="mt-2 text-sm text-neutral-400">It no longer has access to The Homies app, chat or Discord.</p>
        <button type="button" onClick={() => { signOut(); window.__hhAccountBanned = false; setBanned(false); window.location.href = '/'; }} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/15">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
