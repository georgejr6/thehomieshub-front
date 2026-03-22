import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Shield, Wallet, User, Lock, AlertTriangle, LogOut, Trash2, FileText, Heart, Link2, Loader2, CheckCircle2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '@/api/homieshub';

const AccountSettingsPage = () => {
  const { user, refreshMe } = useAuth();
  const { walletMode, exitWalletMode } = useWallet();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  
  // Notification States — seeded from real user prefs
  const [notifications, setNotifications] = useState({
    likes:     user?.emailNotifications?.likes     ?? true,
    comments:  user?.emailNotifications?.comments  ?? true,
    followers: user?.emailNotifications?.followers ?? true,
    mentions:  user?.emailNotifications?.mentions  ?? true,
    dms:       user?.emailNotifications?.dms       ?? true,
    events:    user?.emailNotifications?.events    ?? false,
    wallet:    user?.emailNotifications?.wallet    ?? true,
    wagers:    user?.emailNotifications?.wagers    ?? true,
  });

  // Privacy States
  const [privacy, setPrivacy] = useState({
    messaging: 'everyone',
    comments: 'everyone',
    nsfw: 'blur',
  });
  
  // Confirmation Dialog States
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Discord connect state
  const [discordLoading, setDiscordLoading] = useState(false);
  const [showDiscordOnProfile, setShowDiscordOnProfile] = useState(user?.showDiscordOnProfile ?? true);

  // Handle redirect back from Discord connect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('discord') === 'connected') {
      refreshMe();
      toast({ title: 'Discord Connected!', description: 'Your Discord account is now linked.' });
      navigate('/settings', { replace: true });
    } else if (params.get('discord_error') === 'already_linked') {
      toast({ title: 'Already Linked', description: 'This Discord account is linked to another user.', variant: 'destructive' });
      navigate('/settings', { replace: true });
    }
  }, []);

  const handleNotificationToggle = async (key) => {
    const newVal = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: newVal }));
    try {
      await api.patch('/profile/me/notifications', { [key]: newVal });
      toast({
        title: "Settings Updated",
        description: `${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${newVal ? 'enabled' : 'disabled'}.`,
      });
    } catch {
      setNotifications(prev => ({ ...prev, [key]: !newVal }));
      toast({ title: "Error", description: "Failed to update notification preference.", variant: "destructive" });
    }
  };

  const handlePrivacyChange = (key, value) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
    toast({
        title: "Privacy Updated",
        description: "Your privacy settings have been saved.",
    });
  };

  const handleSaveAccountInfo = () => {
    toast({
      title: "Account Updated",
      description: "Your email and password have been updated successfully.",
    });
    // In a real app, this would call an API
  };

  const handleDisconnectWallet = () => {
      toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected from your account."
      })
  }

  const handleConnectDiscord = async () => {
    setDiscordLoading(true);
    try {
      const { data } = await api.post('/auth/discord/connect');
      window.location.href = data.result.url;
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to start Discord connection.', variant: 'destructive' });
      setDiscordLoading(false);
    }
  };

  const handleDisconnectDiscord = async () => {
    setDiscordLoading(true);
    try {
      await api.delete('/auth/discord/disconnect');
      await refreshMe();
      toast({ title: 'Discord Disconnected', description: 'Your Discord account has been unlinked.' });
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to disconnect Discord.', variant: 'destructive' });
    } finally {
      setDiscordLoading(false);
    }
  };

  const handleDiscordProfileToggle = async () => {
    const newVal = !showDiscordOnProfile;
    setShowDiscordOnProfile(newVal);
    try {
      await api.patch('/profile/me', { showDiscordOnProfile: newVal });
      toast({ title: 'Updated', description: newVal ? 'Discord username visible on profile.' : 'Discord username hidden from profile.' });
    } catch {
      setShowDiscordOnProfile(!newVal);
    }
  };

  const handleDeactivate = () => {
      setIsDeactivateOpen(false);
      toast({
          title: "Account Deactivated",
          description: "You have been logged out. We hope to see you again soon."
      });
      // Logic to logout would go here
  };

  const handleDelete = () => {
      setIsDeleteOpen(false);
      toast({
          title: "Account Deleted",
          description: "Your account and data have been permanently removed."
      });
      // Logic to delete and logout
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8 pb-24">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account details, privacy, and preferences.</p>
      </div>

      {/* 1. Account Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            <CardTitle>Account Information</CardTitle>
          </div>
          <CardDescription>Update your login credentials.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveAccountInfo}>Save Changes</Button>
        </CardFooter>
      </Card>

      {/* 2. Notification Settings */}
      <Card>
        <CardHeader>
           <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Manage what alerts you receive.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {[
            { key: 'likes', label: 'Likes' },
            { key: 'comments', label: 'Comments' },
            { key: 'followers', label: 'New Followers' },
            { key: 'mentions', label: 'Mentions' },
            { key: 'dms', label: 'Direct Messages' },
            { key: 'events', label: 'Event Reminders' },
            { key: 'wallet', label: 'Wallet Activity' },
            { key: 'wagers', label: 'Wager Alerts' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between space-x-2">
              <Label htmlFor={item.key} className="flex-1">{item.label}</Label>
              <Switch
                id={item.key}
                checked={notifications[item.key]}
                onCheckedChange={() => handleNotificationToggle(item.key)}
                className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Privacy & Content Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Privacy & Content</CardTitle>
          </div>
          <CardDescription>Control who can interact with you and what you see.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label>Who can message you?</Label>
                <Select value={privacy.messaging} onValueChange={(val) => handlePrivacyChange('messaging', val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                        <SelectItem value="subscribers">Subscribers Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
             <div className="space-y-2">
                <Label>Who can comment on your posts?</Label>
                <Select value={privacy.comments} onValueChange={(val) => handlePrivacyChange('comments', val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="followers">Followers Only</SelectItem>
                        <SelectItem value="subscribers">Subscribers Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Separator />

            <div className="space-y-2">
                <Label>NSFW Content Visibility</Label>
                 <Select value={privacy.nsfw} onValueChange={(val) => handlePrivacyChange('nsfw', val)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="show">Show</SelectItem>
                        <SelectItem value="blur">Blur (Click to view)</SelectItem>
                        <SelectItem value="hide">Hide completely</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      {/* 4. Wallet Preferences */}
      <Card>
        <CardHeader>
           <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <CardTitle>Wallet Preferences</CardTitle>
          </div>
          <CardDescription>Manage your connected Web3 wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg flex items-center justify-between overflow-hidden">
                <div className="flex flex-col overflow-hidden mr-4">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Connected Address</span>
                    <span className="font-mono text-sm truncate">0x71C...9A23</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnectWallet}>Disconnect</Button>
            </div>
            
            <Link to="/wallet" className="block">
                <Button variant="secondary" className="w-full justify-between group">
                    <span>Enter Wallet Mode</span>
                    <Wallet className="w-4 h-4 ml-2 group-hover:text-primary transition-colors" />
                </Button>
            </Link>
        </CardContent>
      </Card>

      {/* 5. Legal & About (New Section) */}
       <Card>
        <CardHeader>
           <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle>Legal & About</CardTitle>
          </div>
          <CardDescription>Review our community rules and policies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            <Link to="/terms" className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Terms of Service</span>
                </div>
            </Link>
             <Link to="/privacy" className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Privacy Policy</span>
                </div>
            </Link>
             <Link to="/community-guidelines" className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Community Guidelines</span>
                </div>
            </Link>
        </CardContent>
      </Card>

      {/* 5b. Connected Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            <CardTitle>Connected Accounts</CardTitle>
          </div>
          <CardDescription>Link your Discord so others can find you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Discord logo */}
              <div className="w-9 h-9 rounded-lg bg-[#5865F2] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="white">
                  <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm">Discord</p>
                {user?.discordUsername ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-muted-foreground">@{user.discordUsername}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not connected</p>
                )}
              </div>
            </div>
            {user?.discordUsername ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectDiscord}
                disabled={discordLoading || user?.sub?.startsWith('discord:')}
                title={user?.sub?.startsWith('discord:') ? "This is your login method" : ""}
              >
                {discordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Disconnect'}
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
                onClick={handleConnectDiscord}
                disabled={discordLoading}
              >
                {discordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Connect
              </Button>
            )}
          </div>

          {user?.discordUsername && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="discord-profile" className="flex-1 text-sm">Show Discord username on my profile</Label>
                <Switch
                  id="discord-profile"
                  checked={showDiscordOnProfile}
                  onCheckedChange={handleDiscordProfileToggle}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 6. Account Management */}
      <Card className="border-red-500/20 shadow-none">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <CardTitle className="text-red-500">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium">Deactivate Account</h4>
                    <p className="text-sm text-muted-foreground">Temporarily disable your profile.</p>
                </div>
                <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
                    <DialogTrigger asChild>
                         <Button variant="outline">Deactivate</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Deactivate Account?</DialogTitle>
                            <DialogDescription>
                                This will temporarily hide your profile and content. You can reactivate it anytime by logging back in.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDeactivate}>Deactivate</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            
            <Separator />

             <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-medium">Delete Account</h4>
                    <p className="text-sm text-muted-foreground">Permanently remove your account and data.</p>
                </div>
                 <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <DialogTrigger asChild>
                         <Button variant="destructive">Delete Account</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete Permanently</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettingsPage;