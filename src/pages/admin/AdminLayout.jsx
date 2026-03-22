import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clapperboard, LayoutDashboard, Users, FolderKanban, LogOut, Home, Settings, DollarSign, Shield, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    signOut();
    navigate('/admin/login');
  };
  
  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'moderator'] },
    { to: '/admin/content', icon: FolderKanban, label: 'Content', roles: ['admin', 'moderator'] },
    { to: '/admin/users', icon: Users, label: 'Users', roles: ['admin', 'moderator'] },
    { to: '/admin/monetization', icon: DollarSign, label: 'Monetization', roles: ['admin'] },
    { to: '/admin/features', icon: Settings, label: 'Feature Control', roles: ['admin'] },
    { to: '/admin/invite',   icon: UserPlus, label: 'Invite Users',    roles: ['admin'] },
  ];

  const baseLinkClasses = "flex items-center px-4 py-3 text-base font-medium rounded-lg transition-colors";
  const inactiveLinkClasses = "text-muted-foreground hover:bg-accent hover:text-accent-foreground";
  const activeLinkClasses = "bg-primary text-primary-foreground shadow-sm";

  const userRole = user?.isAdmin ? 'admin' : (user?.isModerator ? 'moderator' : 'user');

  return (
    <div className="flex h-screen bg-background text-foreground font-sans">
      <aside className="w-64 flex-shrink-0 bg-card border-r flex flex-col">
        <div className="flex flex-col items-center justify-center h-24 border-b">
             <div className="flex items-center">
                 <Clapperboard className="h-8 w-8 text-primary" />
                 <span className="ml-3 text-2xl font-bold text-foreground">Admin</span>
             </div>
             {user?.isModerator && (
                <div className="flex items-center gap-1 mt-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full text-xs font-semibold border border-yellow-500/20">
                    <Shield className="h-3 w-3" /> Moderator Mode
                </div>
             )}
        </div>
        <nav className="flex-1 p-4 space-y-2">
             {navItems.filter(item => item.roles.includes(userRole)).map(item => (
              <NavLink 
                key={item.to}
                to={item.to}
                className={({ isActive }) => `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`}
              >
                <item.icon className="w-5 h-5 mr-4" />
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="p-4 border-t space-y-2">
            <Link 
              to="/" 
              className={`${baseLinkClasses} ${inactiveLinkClasses}`}
            >
              <Home className="w-5 h-5 mr-4" />
              Back to Site
            </Link>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-accent-foreground" onClick={handleLogout}>
            <LogOut className="w-5 h-5 mr-4" />
            Logout
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-muted/30">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;