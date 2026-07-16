import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Clapperboard, LayoutDashboard, Users, FolderKanban, LogOut, Home, Settings, DollarSign, Shield, UserPlus, Film, Bell, Music, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/admin/login');
  };

  // Grouped nav so the sidebar reads as an organized console, not a flat list.
  const navGroups = [
    {
      heading: 'Overview',
      items: [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'moderator'] },
        { to: '/admin/visitors', icon: Activity, label: 'Visitors', roles: ['admin', 'moderator'] },
      ],
    },
    {
      heading: 'Content',
      items: [
        { to: '/admin/content', icon: FolderKanban, label: 'Content', roles: ['admin', 'moderator'] },
        { to: '/admin/media', icon: Film, label: 'Media Manager', roles: ['admin'] },
        { to: '/admin/music', icon: Music, label: 'Music Manager', roles: ['admin'] },
      ],
    },
    {
      heading: 'Community',
      items: [
        { to: '/admin/users', icon: Users, label: 'Users', roles: ['admin', 'moderator'] },
        { to: '/admin/invite', icon: UserPlus, label: 'Invite Users', roles: ['admin'] },
        { to: '/admin/push', icon: Bell, label: 'Push Notifications', roles: ['admin'] },
      ],
    },
    {
      heading: 'Business',
      items: [
        { to: '/admin/monetization', icon: DollarSign, label: 'Monetization', roles: ['admin'] },
        { to: '/admin/features', icon: Settings, label: 'Feature Control', roles: ['admin'] },
      ],
    },
  ];

  const userRole = user?.isAdmin ? 'admin' : (user?.isModerator ? 'moderator' : 'user');

  return (
    <div className="relative flex h-screen overflow-hidden text-white font-sans">
      {/* Ambient gradient backdrop for the glass surfaces to sit on */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[#07070a]">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full bg-fuchsia-600/10 blur-[150px]" />
        <div className="absolute -bottom-40 left-1/3 w-[520px] h-[520px] rounded-full bg-sky-600/10 blur-[150px]" />
      </div>

      {/* ── Glass sidebar ── */}
      <aside className="w-64 flex-shrink-0 m-3 mr-0 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl flex flex-col overflow-hidden">
        <div className="flex flex-col items-center justify-center h-24 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-primary/15 border border-white/10 flex items-center justify-center">
              <Clapperboard className="h-5 w-5 text-primary" />
            </span>
            <span className="text-2xl font-black tracking-tight">Admin</span>
          </div>
          {user?.isModerator && (
            <div className="flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[11px] font-semibold border border-amber-500/20">
              <Shield className="h-3 w-3" /> Moderator Mode
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {navGroups.map((group) => {
            const items = group.items.filter((item) => item.roles.includes(userRole));
            if (!items.length) return null;
            return (
              <div key={group.heading}>
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">{group.heading}</p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                          isActive
                            ? 'bg-primary/15 text-white border border-primary/30 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.5)]'
                            : 'text-white/55 hover:text-white hover:bg-white/[0.06] border border-transparent'
                        }`
                      }
                    >
                      <item.icon className="w-[18px] h-[18px]" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors">
            <Home className="w-[18px] h-[18px]" /> Back to Site
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-white/55 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
            <LogOut className="w-[18px] h-[18px]" /> Logout
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
