import React, { useState, useEffect } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Loader2, MessageCircle, AlertTriangle, Scissors } from 'lucide-react';
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

const mockNotifications = [
  {
    id: 1,
    user: { name: 'Carlos Jetsetter', username: 'carlosjet', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=faces' },
    type: 'like',
    content: 'liked your video "Tokyo Night Market Street Food Tour!".',
    timestamp: '2m ago',
    read: false,
  },
  {
    id: 2,
    user: { name: 'Benny Travels', username: 'bennytravels', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces' },
    type: 'comment',
    content: 'commented: "Looks amazing! Adding this to my bucket list!"',
    timestamp: '15m ago',
    read: false,
  },
  {
    id: 3,
    user: { name: 'David Roams', username: 'davidroams', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&h=150&fit=crop&crop=faces' },
    type: 'follow',
    content: 'started following you.',
    timestamp: '1h ago',
    read: true,
  },
    {
    id: 4,
    user: { name: 'Admin', username: 'admin', avatar: 'https://avatar.vercel.sh/admin.png' },
    type: 'system',
    content: 'Welcome to The Homies Hub! Start by exploring or creating a post.',
    timestamp: '1d ago',
    read: true,
  },
   {
    id: 5,
    user: { name: 'System', username: 'system', avatar: 'https://avatar.vercel.sh/homies.png' },
    type: 'alert',
    content: 'Your subscription is about to expire. Renew now to keep premium features.',
    timestamp: '2d ago',
    read: true,
  },
  {
    // Placeholder so the clip_job notification kind is wired up end-to-end
    // (icon, copy, deep link) ahead of a real notifications-list API --
    // see src/pages/MyAIPage.jsx / src/pages/MyClipsPage.jsx.
    id: 6,
    user: { name: 'Homies AI', username: 'homiesai', avatar: 'https://avatar.vercel.sh/homies.png' },
    type: 'clip_job',
    clipJobId: 'demo',
    content: 'Your clip is ready to view.',
    timestamp: '3d ago',
    read: true,
  },
];

// Notification kinds whose deep link isn't a profile -- add new
// backend-driven types here (icon + destination) as they're wired up.
const NOTIFICATION_LINKS = {
  clip_job: (n) => `/clips/${n.clipJobId}`,
};
const NOTIFICATION_ICONS = {
  clip_job: Scissors,
};

const NotificationItem = ({ notification }) => {
  const href = NOTIFICATION_LINKS[notification.type]
    ? NOTIFICATION_LINKS[notification.type](notification)
    : `/profile/${notification.user.username}`;
  const TypeIcon = NOTIFICATION_ICONS[notification.type];

  return (
    <Link to={href} className="block w-full">
      <div className={cn(
        "flex items-start gap-4 p-3 hover:bg-accent transition-colors",
        !notification.read && "bg-primary/10"
      )}>
        {TypeIcon ? (
          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <TypeIcon className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <Avatar className="h-10 w-10">
            <AvatarImage src={notification.user.avatar} alt={notification.user.name} />
            <AvatarFallback>{notification.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1">
          <p className="text-sm">
            {TypeIcon ? (
              <span className="text-foreground">{notification.content}</span>
            ) : (
              <>
                <span className="font-semibold">{notification.user.name}</span>
                <span className="text-muted-foreground"> {notification.content}</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{notification.timestamp}</p>
        </div>
        {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-2" />}
      </div>
    </Link>
  );
};

const MessagePreviewItem = ({ thread, user, navigate }) => {
    const otherParticipant = thread.participants.find(p => p !== user?.username);
    
    // Safety check in case participant logic fails or data is malformed
    if (!otherParticipant) return null;

    const handleClick = () => {
        navigate(`/inbox?user=${otherParticipant}`);
    };
    
    // Don't show if thread is muted or archived in main view (optional logic, kept simple here)
    if (thread.archived) return null;

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
                         <span className="font-semibold text-sm">{otherParticipant}</span>
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
  const { threads } = useMessages();
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("notifications");

  // Determine notification unread count
  const unreadNotifications = notifications.filter(n => !n.read).length;
  // Determine message unread count - filter out muted or archived threads if needed
  const unreadMessages = threads.filter(t => !t.lastMessage.read && t.lastMessage.sender !== user?.username && !t.muted && !t.archived).length;
  
  const totalUnread = unreadNotifications + unreadMessages;

  const handleOpenChange = (open) => {
    if (open) {
      setIsLoading(true);
      // Simulate fetch
      setTimeout(() => {
        setNotifications(mockNotifications);
        setIsLoading(false);
      }, 800);
    }
  };

  const handleMarkAllRead = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (activeTab === 'notifications') {
         setNotifications(prev => prev.map(n => ({...n, read: true})));
         toast({ title: '✅ Notifications cleared', description: 'Marked all notifications as read.' });
    } else if (activeTab === 'messages') {
        // Logic to mark messages read would go here via context
        toast({ title: '✅ Messages marked read', description: 'All messages marked as read.' });
    }
  };
  
  const alerts = notifications.filter(n => n.type === 'system' || n.type === 'alert');

  return (
    <Popover onOpenChange={handleOpenChange}>
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
                    <NotificationItem key={notification.id} notification={notification} />
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
                         threads.filter(t => !t.archived).length > 0 ? (
                            threads.filter(t => !t.archived).map(thread => (
                                <MessagePreviewItem key={thread.id} thread={thread} user={user} navigate={navigate} />
                            ))
                         ) : (
                             <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                                <MessageCircle className="h-12 w-12 mb-2 opacity-20" />
                                <p className="text-sm">No messages yet.</p>
                                <Button variant="link" size="sm" onClick={() => navigate('/inbox')}>Start a chat</Button>
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
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/inbox')}>
                        View all messages
                    </Button>
                </div>
            </TabsContent>

            <TabsContent value="alerts" className="mt-0">
                <div className="max-h-[60vh] overflow-y-auto min-h-[300px]">
                     {alerts.length > 0 ? (
                        alerts.map(alert => (
                            <div key={alert.id} className="p-4 border-b hover:bg-muted/50 transition-colors">
                                <div className="flex gap-3">
                                    <div className="mt-1">
                                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm">System Alert</h4>
                                        <p className="text-sm text-muted-foreground">{alert.content}</p>
                                        <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
                                    </div>
                                </div>
                            </div>
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