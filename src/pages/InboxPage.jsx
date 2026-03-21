import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMessages } from '@/contexts/MessageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Send, MessageSquarePlus, MoreVertical, Archive, Check, ArrowLeft, Image as ImageIcon, Video as VideoIcon, Smile, Gift, Mic, Paperclip, BellOff, Bell, Trash2, Flag, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const InboxPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { threads, requests, sendMessage, getThread, createThread, acceptRequest, archiveRequest, searchUsers, markAsRead, muteThread, archiveThread, deleteThread, loadMessages } = useMessages();
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const fileInputRef = useRef(null);
  
  // State
  const activeUserParam = searchParams.get('user');
  const [activeThread, setActiveThread] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('primary');
  
  // Media Upload State
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
  const [isUploading, setIsUploading] = useState(false);

  // Initialize active thread from URL
  useEffect(() => {
    if (activeUserParam) {
      const thread = getThread(activeUserParam) || createThread(activeUserParam);
      setActiveThread(thread);
      if (thread.id && thread.id !== 'temp') {
        markAsRead(thread.id);
        loadMessages(thread.id);
      }
    } else {
      setActiveThread(null);
    }
  }, [activeUserParam, threads]);

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query) {
      const results = await searchUsers(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleUserSelect = (username) => {
    setSearchParams({ user: username });
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !selectedMedia) || !activeThread) return;

    const recipient = activeThread.participants.find(p => p !== user.username) || activeUserParam;
    
    // If media is selected, send as media type
    if (selectedMedia) {
        sendMessage(recipient, messageInput || (mediaType === 'image' ? 'Sent an image' : 'Sent a video'), mediaType, selectedMedia);
    } else {
        sendMessage(recipient, messageInput);
    }
    
    setMessageInput('');
    setSelectedMedia(null);
    setMediaType(null);
  };

  const handleFileSelect = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsUploading(true);
      // Simulate upload
      setTimeout(() => {
          const objectUrl = URL.createObjectURL(file);
          setSelectedMedia(objectUrl);
          setMediaType(file.type.startsWith('video') ? 'video' : 'image');
          setIsUploading(false);
      }, 1000);
  };

  const handleRemoveMedia = () => {
      setSelectedMedia(null);
      setMediaType(null);
      if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleSettingsAction = (action) => {
      if (!activeThread) return;
      
      switch(action) {
          case 'mute':
              muteThread(activeThread.id, !activeThread.muted);
              toast({ title: activeThread.muted ? "Notifications On" : "Notifications Off", description: `You have ${activeThread.muted ? 'unmuted' : 'muted'} this conversation.` });
              break;
          case 'archive':
              archiveThread(activeThread.id);
              setActiveThread(null);
              setSearchParams({});
              toast({ title: "Conversation Archived", description: "This conversation has been moved to archives." });
              break;
          case 'delete':
              deleteThread(activeThread.id);
              setActiveThread(null);
              setSearchParams({});
              toast({ title: "Conversation Deleted", description: "The conversation has been permanently deleted.", variant: "destructive" });
              break;
          case 'report':
              toast({ title: "Report Sent", description: "We will review this conversation shortly." });
              break;
          default:
              break;
      }
  }
  
  const getOtherParticipant = (thread) => {
      const other = thread.participants.find(p => p !== user.username);
      const otherObj = thread.participantObjects?.find(p =>
        (typeof p === 'object' ? p.username : p) === other
      );
      return {
          username: other,
          avatar: otherObj?.avatarUrl || `https://avatar.vercel.sh/${other}.png`,
          name: otherObj?.name || other,
      };
  }
  
  const filteredThreads = threads.filter(t => {
      if (t.archived) return false;
      const other = t.participants.find(p => p !== user.username) || '';
      return other.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Mobile View Logic
  if (isMobile && activeThread) {
      return (
          <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
              <div className="flex items-center p-3 border-b border-border">
                  <Button variant="ghost" size="icon" onClick={() => {
                      setSearchParams({});
                      setActiveThread(null);
                  }}>
                      <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center ml-2 flex-1">
                       <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={`https://avatar.vercel.sh/${activeThread.participants[0]}.png`} />
                          <AvatarFallback>{activeThread.participants[0].charAt(0)}</AvatarFallback>
                       </Avatar>
                       <span className="font-semibold">{activeThread.participants[0]}</span>
                  </div>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleSettingsAction('mute')}>
                               {activeThread.muted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                               {activeThread.muted ? 'Unmute' : 'Mute'} Notifications
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleSettingsAction('archive')}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleSettingsAction('report')}><Flag className="mr-2 h-4 w-4" /> Report</DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem className="text-destructive" onClick={() => handleSettingsAction('delete')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
              <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                      {activeThread.messages?.map((msg) => (
                          <div
                              key={msg.id}
                              className={cn(
                                  "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                  msg.sender === user.username
                                      ? "ml-auto bg-primary text-primary-foreground"
                                      : "bg-muted"
                              )}
                          >
                               {msg.type === 'image' && msg.mediaUrl && (
                                  <img src={msg.mediaUrl} alt="Sent content" className="rounded-md max-w-full h-auto mb-1 max-h-60 object-cover" />
                               )}
                               {msg.type === 'video' && msg.mediaUrl && (
                                   <video src={msg.mediaUrl} controls className="rounded-md max-w-full h-auto mb-1 max-h-60" />
                               )}
                               {msg.content}
                          </div>
                      ))}
                      {(!activeThread.messages || activeThread.messages.length === 0) && (
                          <p className="text-center text-muted-foreground mt-10">Start the conversation!</p>
                      )}
                  </div>
              </ScrollArea>
              {selectedMedia && (
                  <div className="px-4 py-2 bg-muted/30 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2">
                           <ImageIcon className="h-4 w-4 text-muted-foreground" />
                           <span className="text-xs text-muted-foreground">Media selected</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveMedia}>
                          <X className="h-4 w-4" />
                      </Button>
                  </div>
              )}
              <div className="p-3 border-t border-border flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                  <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                      <Input 
                          value={messageInput} 
                          onChange={(e) => setMessageInput(e.target.value)} 
                          placeholder={isUploading ? "Uploading..." : "Message..."}
                          className="flex-1 rounded-full"
                          disabled={isUploading}
                      />
                      <Button type="submit" size="icon" className="rounded-full" disabled={(!messageInput.trim() && !selectedMedia) || isUploading}>
                          <Send className="h-4 w-4" />
                      </Button>
                  </form>
              </div>
          </div>
      )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar / Thread List */}
      <div className={cn("w-full md:w-80 border-r border-border flex flex-col", (isMobile && activeThread) ? "hidden" : "flex")}>
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Messages</h1>
            <Button variant="ghost" size="icon"><MessageSquarePlus className="h-5 w-5" /></Button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Search users..." 
                className="pl-9 bg-muted/50 focus:bg-background transition-colors" 
                value={searchQuery}
                onChange={handleSearch}
            />
             {searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
                    <p className="text-xs font-semibold text-muted-foreground px-3 py-2 bg-muted/50">Suggestions</p>
                    {searchResults.map(u => (
                         <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors" onClick={() => handleUserSelect(u.username)}>
                             <Avatar className="h-8 w-8"><AvatarImage src={u.avatar} /><AvatarFallback>{u.username.charAt(0)}</AvatarFallback></Avatar>
                             <div className="flex flex-col">
                                 <span className="font-medium text-sm">{u.name}</span>
                                 <span className="text-xs text-muted-foreground">@{u.username}</span>
                             </div>
                         </div>
                     ))}
                </div>
            )}
          </div>
        </div>
        
        {/* Thread List Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
             <div className="px-2 mt-2">
                <Tabs defaultValue="primary" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="primary">Primary</TabsTrigger>
                        <TabsTrigger value="requests">Requests {requests.length > 0 && `(${requests.length})`}</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            
            <ScrollArea className="flex-1">
                {activeTab === 'primary' ? (
                    <div className="flex flex-col p-2 gap-1">
                        {filteredThreads.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No messages yet.</p>}
                        {filteredThreads.map(thread => {
                            const participant = getOtherParticipant(thread);
                            const isActive = activeThread?.id === thread.id;
                            const isUnread = !thread.lastMessage.read && thread.lastMessage.sender !== user.username;
                            
                            return (
                                <div 
                                    key={thread.id} 
                                    onClick={() => handleUserSelect(participant.username)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group",
                                        isActive ? "bg-accent" : "hover:bg-muted/50",
                                        isUnread ? "font-semibold bg-primary/5" : ""
                                    )}
                                >
                                    <div className="relative">
                                        <Avatar>
                                            <AvatarImage src={participant.avatar} />
                                            <AvatarFallback>{participant.username.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        {isUnread && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-1">
                                                <span className="truncate">{participant.username}</span>
                                                {thread.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                                            </div>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-1">
                                                {formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: false })}
                                            </span>
                                        </div>
                                        <p className={cn("text-xs truncate", isUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                                            {thread.lastMessage?.sender === user.username ? 'You: ' : ''}
                                            {thread.lastMessage?.type === 'image' ? 'Sent an image' : 
                                             thread.lastMessage?.type === 'video' ? 'Sent a video' :
                                             thread.lastMessage?.content}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col p-2 gap-2">
                        {requests.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No new message requests.</p>}
                        {requests.map(req => (
                            <Card key={req.id} className="overflow-hidden">
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={`https://avatar.vercel.sh/${req.participants[0]}.png`} />
                                            <AvatarFallback>{req.participants[0].charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm">@{req.participants[0]}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{req.lastMessage.content}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => acceptRequest(req.id)}>
                                            <Check className="w-3 h-3 mr-1" /> Accept
                                        </Button>
                                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => archiveRequest(req.id)}>
                                            <Archive className="w-3 h-3 mr-1" /> Archive
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
      </div>

      {/* Main Chat Area - Hidden on mobile if no thread active */}
      <div className={cn("flex-1 flex flex-col bg-background/50", isMobile ? "hidden" : "flex")}>
        {activeThread ? (
            <>
                <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/95 backdrop-blur-sm">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${activeThread.participants.find(p => p !== user.username)}`)}>
                        <Avatar>
                            <AvatarImage src={`https://avatar.vercel.sh/${activeThread.participants.find(p => p !== user.username)}.png`} />
                            <AvatarFallback>{activeThread.participants[0].charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="font-semibold">{activeThread.participants.find(p => p !== user.username)}</h2>
                            <p className="text-xs text-muted-foreground">Active now</p>
                        </div>
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleSettingsAction('mute')}>
                               {activeThread.muted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                               {activeThread.muted ? 'Unmute' : 'Mute'} Notifications
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleSettingsAction('archive')}><Archive className="mr-2 h-4 w-4" /> Archive</DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleSettingsAction('report')}><Flag className="mr-2 h-4 w-4" /> Report</DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem className="text-destructive" onClick={() => handleSettingsAction('delete')}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>
                
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {activeThread.messages?.map((msg) => (
                          <div
                              key={msg.id}
                              className={cn(
                                  "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                  msg.sender === user.username
                                      ? "ml-auto bg-primary text-primary-foreground"
                                      : "bg-muted"
                              )}
                          >
                               {msg.type === 'image' && msg.mediaUrl && (
                                   <div className="relative group cursor-pointer" onClick={() => window.open(msg.mediaUrl, '_blank')}>
                                       <img src={msg.mediaUrl} alt="Shared content" className="rounded-md max-w-full h-auto mb-1 max-h-[300px] object-cover" />
                                   </div>
                               )}
                               {msg.type === 'video' && msg.mediaUrl && (
                                   <video src={msg.mediaUrl} controls className="rounded-md max-w-full h-auto mb-1 max-h-[300px]" />
                               )}
                              {msg.content}
                          </div>
                        ))}
                         {(!activeThread.messages || activeThread.messages.length === 0) && (
                          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                              <MessageSquarePlus className="h-12 w-12 mb-2 opacity-20" />
                              <p>Start the conversation with @{activeUserParam}</p>
                          </div>
                      )}
                    </div>
                </ScrollArea>
                
                {/* Media Preview Area */}
                {selectedMedia && (
                    <div className="px-6 py-3 bg-muted/30 border-t flex items-center justify-between animate-in slide-in-from-bottom-5">
                         <div className="flex items-center gap-3">
                             <div className="relative h-16 w-16 rounded overflow-hidden bg-black/50">
                                 {mediaType === 'image' ? (
                                     <img src={selectedMedia} alt="Preview" className="h-full w-full object-cover" />
                                 ) : (
                                     <video src={selectedMedia} className="h-full w-full object-cover" />
                                 )}
                             </div>
                             <div>
                                 <p className="text-sm font-medium">{mediaType === 'image' ? 'Image' : 'Video'} selected</p>
                                 <p className="text-xs text-muted-foreground">Ready to send</p>
                             </div>
                         </div>
                         <Button variant="ghost" size="sm" onClick={handleRemoveMedia}>
                             <X className="h-4 w-4 mr-2" /> Remove
                         </Button>
                    </div>
                )}

                <div className="p-4 border-t border-border bg-background">
                    <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
                        {/* Media Actions */}
                        <div className="flex items-center gap-1">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,video/*" 
                                onChange={handleFileSelect}
                            />
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
                                        <MessageSquarePlus className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56" align="start">
                                    <div className="grid gap-2">
                                        <Button variant="ghost" className="justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
                                            <ImageIcon className="h-4 w-4" /> Photos & Videos
                                        </Button>
                                        <Button variant="ghost" className="justify-start gap-2" onClick={() => toast({ title: "Coming Soon", description: "Stickers are coming in the next update!" })}>
                                            <Smile className="h-4 w-4" /> Stickers
                                        </Button>
                                        <Button variant="ghost" className="justify-start gap-2" onClick={() => toast({ title: "Coming Soon", description: "Gifting is coming in the next update!" })}>
                                            <Gift className="h-4 w-4" /> Send Gift
                                        </Button>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex-1 relative">
                            <Input 
                                value={messageInput} 
                                onChange={(e) => setMessageInput(e.target.value)} 
                                placeholder={isUploading ? "Uploading media..." : "Type a message..."}
                                className="pr-10 rounded-full bg-muted/50 border-transparent focus:bg-background focus:border-input transition-colors"
                                disabled={isUploading}
                            />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => toast({ title: "Coming Soon", description: "Voice messages coming soon!" })}>
                                <Mic className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <Button type="submit" disabled={(!messageInput.trim() && !selectedMedia) || isUploading} size="icon" className="rounded-full shrink-0">
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <div className="bg-muted/50 p-6 rounded-full mb-4 animate-in zoom-in-50 duration-500">
                    <Send className="h-10 w-10 opacity-50" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your Messages</h3>
                <p>Send private photos and messages to a friend or group.</p>
                <Button variant="default" className="mt-6" onClick={() => document.querySelector('input[placeholder="Search users..."]')?.focus()}>
                    Start a Chat
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};

export default InboxPage;