import React, { useState, useEffect, useCallback } from 'react';
import api from '@/api/homieshub';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, MessageCircle, AlertTriangle, Scissors, UserPlus, Heart, MessageSquare, AtSign, Reply, Gift, Coins, Megaphone, ShoppingBag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessages } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

// Real feed: GET /api/notifications (backend utils/notifications.js). Each row
// carries data.url (where a click goes); older writers use data.deepLink
// (clip jobs) or data.cta (membership nudges).
const NOTIFICATION_ICONS = {
  follow: UserPlus,
  like: Heart,
  comment: MessageSquare,
  mention: AtSign,
  reply: Reply,
  tip: Gift,
  gift: Gift,
  points: Coins,
  clip_job: Scissors,
  campaign: Megaphone,
  system: Bell,
  shop: ShoppingBag, // order updates / bag reminders (data.url = /shop/orders, /shop/cart)
};
const ALERT_TYPES = new Set(['system', 'campaign']);

// App-only screens a notification may point at → their web page.
const WEB_EQUIVALENT = { '/points': '/wallet' };

export function notificationHref(n) {
  const d = n?.data || {};
  if (typeof d.url === 'string' && d.url) {
    const path = d.url.split(/[?#]/)[0];
    return WEB_EQUIVALENT[path] || d.url;
  }
  if (typeof d.deepLink === 'string' && d.deepLink) return d.deepLink;
  if (d.cta === 'upgrade') return '/memberships';
  if (n?.type === 'follow' && d.actor) return `/profile/${d.actor}`;
  return null;
}

const timeAgo = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? formatDistanceToNow(d, { addSuffix: true }) : '';
};

const NotificationItem = ({ notification, onOpen }) => {
  const TypeIcon = NOTIFICATION_ICONS[notification.type] || Bell;
  return (
    <button type="button" onClick={() => onOpen(notification)} className="block w-full text-left">
      <div className={cn(
        "flex items-start gap-4 p-3 hover:bg-accent transition-colors",
        !notification.read && "bg-primary/10"
      )}>
        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <TypeIcon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">
            {notification.title && <span className="font-semibold">{notification.title}</span>}
            {notification.title && notification.body ? <br /> : null}
            {notification.body && <span className="text-muted-foreground break-words">{notification.body}</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{timeAgo(notification.createdAt)}</p>
        </div>
        {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-2" />}
      </div>
    </button>
  );
};

const MessagePreviewItem = ({ thread, user, navigate }) => {
    const otherParticipant = thread.participants.find(p => p !== user?.username);
    
    // Safety check in case participant logic fails or data is malformed
    if (!otherParticipant) return null;

    const handleClick = () => {
        navigate(`/inbox?user=${encodeURIComponent(otherParticipant)}`);
    };
    
    // Don't show if thread is muted or archived in main view (optional logic, kept simple here)
    if (thread.archived) return null;

    if (!thread.lastMessage) return null;
    const isUnread = !thread.lastMessage.read && thread.lastMessage.sender !== user?.username;

    return (
        <div onClick={handleClick} className="block w-full cursor-pointer">
             <div className={cn(
                "flex items-center gap-4 p-3 hover:bg-accent transition-colors",
                isUnread && "bg-primary/10"
             )}>
                <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://avatar.vercel.sh/${otherParticipant}.png`} />
                    <AvatarFallback>{otherParticipant.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                     <div className="flex justify-between items-center mb-1">
                         <span className="font-semibold text-sm">{otherParticipant}{thread.isRequest && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">request</span>}</span>
                         <span className="text-xs text-muted-foreground whitespace-nowrap">
                             {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: false })}
                         </span>
                     </div>
                     <p className={cn(
                         "text-xs truncate", 
                         isUnread ? "text-foreground font-medium" : "text-muted-foreground"
                     )}>
                        {thread.lastMessage.sender === user?.username ? 'You: ' : ''}
                        {thread.lastMessage.type === 'image' ? 'Sent an image' : 
                         thread.lastMessage.type === 'video' ? 'Sent a video' :
                         thread.lastMessage.content}
                     </p>
                </div>
                {isUnread && (
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
             </div>
        </div>
    )
}

const NotificationsPopover = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { threads, requests, markAsRead } = useMessages();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeTab, setActiveTab] = useState("notifications");

  // Requests (people you don't follow) are real DMs too — list them with the threads.
  const messageThreads = [
    ...threads.filter(t => !t.archived),
    ...requests.map(t => ({ ...t, isRequest: true })),
  ].filter(t => t.lastMessage)
   .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  const unreadMessages = messageThreads.filter(t => !t.lastMessage.read && t.lastMessage.sender !== user?.username && !t.muted).length;

  const totalUnread = unreadNotifications + unreadMessages;

  // Desktop app: mirror the count on the taskbar/dock icon.
  useEffect(() => { window.homiesDesktop?.setBadge?.(user ? totalUnread : 0); }, [user, totalUnread]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/notifications', { params: { limit: 30 } });
      setNotifications(data.result?.notifications || []);
      setUnreadNotifications(data.result?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }, [user]);

  // Badge: cheap unread-count poll while signed in (and on tab focus).
  useEffect(() => {
    if (!user) { setNotifications([]); setUnreadNotifications(0); return; }
    let stopped = false;
    const refresh = async () => {
      try {
        const { data } = await api.get('/notifications/unread-count');
        if (!stopped) setUnreadNotifications(data.result?.unreadCount || 0);
      } catch { /* keep the last count on a hiccup */ }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    const onFocus = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onFocus);
    return () => { stopped = true; clearInterval(interval); document.removeEventListener('visibilitychange', onFocus); };
  }, [user]);

  const handleOpenChange = async (open) => {
    setIsOpen(open);
    if (open && user) {
      setIsLoading(notifications.length === 0);
      await loadNotifications();
      setIsLoading(false);
    }
  };

  const openNotification = (n) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
      setUnreadNotifications(c => Math.max(0, c - 1));
      api.post(`/notifications/${n.id}/read`).catch(() => {});
    }
    const href = notificationHref(n);
    if (!href) return;
    setIsOpen(false);
    if (/^https?:\/\//i.test(href)) window.open(href, '_blank', 'noopener,noreferrer');
    else if (href.startsWith('/') && !href.startsWith('//')) navigate(href);
  };

  const handleMarkAllRead = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (activeTab === 'messages') {
        const unread = messageThreads.filter(t => !t.lastMessage.read && t.lastMessage.sender !== user?.username);
        await Promise.all(unread.map(t => markAsRead(t.id)));
        toast({ title: '✅ Messages marked read', description: 'All messages marked as read.' });
        return;
    }
    try {
        await api.post('/notifications/read-all');
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadNotifications(0);
        toast({ title: '✅ Notifications cleared', description: 'Marked all notifications as read.' });
    } catch {
        toast({ title: "Couldn't mark notifications read", description: 'Try again in a moment.', variant: 'destructive' });
    }
  };

  const alerts = notifications.filter(n => ALERT_TYPES.has(n.type));

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
             <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0 overflow-hidden" align="end">
        <Tabs defaultValue="notifications" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b">
                 <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="notifications" className="text-xs">
                        Notifications
                        {unreadNotifications > 0 && <span className="ml-1.5 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">{unreadNotifications}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="messages" className="text-xs">
                        Messages
                         {unreadMessages > 0 && <span className="ml-1.5 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">{unreadMessages}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="text-xs">Alerts</TabsTrigger>
                </TabsList>
            </div>
            
            <div className="flex justify-end px-2 py-1 bg-muted/20">
                 <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isLoading} className="h-6 text-[10px] text-muted-foreground">
                    <CheckCheck className="h-3 w-3 mr-1"/>
                    Mark all read
                </Button>
            </div>

            <TabsContent value="notifications" className="mt-0">
                <div className="max-h-[60vh] overflow-y-auto min-h-[300px]">
                {isLoading ? (
                    <div className="p-3 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                        </div>
                        </div>
                    ))}
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map(notification => (
                    <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <Bell className="h-12 w-12 mb-2 opacity-20" />
                        <p className="text-sm">No new notifications.</p>
                    </div>
                )}
                </div>
            </TabsContent>
            
            <TabsContent value="messages" className="mt-0">
                <div className="max-h-[60vh] overflow-y-auto min-h-[300px]">
                     {user ? (
                         messageThreads.length > 0 ? (
                            messageThreads.map(thread => (
                                <MessagePreviewItem key={thread.id} thread={thread} user={user} navigate={(to) => { setIsOpen(false); navigate(to); }} />
                            ))
                         ) : (
                             <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                <MessageCircle className="h-12 w-12 mb-2 opacity-20" />
                                <p className="text-sm">No messages yet.</p>
                                <Button variant="link" size="sm" onClick={() => { setIsOpen(false); navigate('/inbox'); }}>Start a chat</Button>
                            </div>
                         )
                     ) : (
                         <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground p-4 text-center">
                             <p className="text-sm mb-2">Login to see your messages.</p>
                             <Button size="sm" asChild><Link to="/">Login</Link></Button>
                         </div>
                     )}
                </div>
                <div className="p-2 border-t text-center">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setIsOpen(false); navigate('/inbox'); }}>
                        View all messages
                    </Button>
                </div>
            </TabsContent>

            <TabsContent value="alerts" className="mt-0">
                <div className="max-h-[60vh] overflow-y-auto min-h-[300px]">
                     {alerts.length > 0 ? (
                        alerts.map(alert => (
                            <button type="button" key={alert.id} onClick={() => openNotification(alert)} className="block w-full text-left p-4 border-b hover:bg-muted/50 transition-colors">
                                <div className="flex gap-3">
                                    <div className="mt-1">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">{alert.title || 'System Alert'}</h4>
                                        {alert.body && <p className="text-sm text-muted-foreground">{alert.body}</p>}
                                        <p className="text-xs text-muted-foreground mt-2">{timeAgo(alert.createdAt)}</p>
                                    </div>
                                </div>
                            </button>
                        ))
                     ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <CheckCheck className="h-12 w-12 mb-2 opacity-20" />
                            <p className="text-sm">No new alerts.</p>
                        </div>
                     )}
                </div>
            </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopover;