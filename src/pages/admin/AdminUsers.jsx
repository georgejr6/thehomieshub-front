import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, ShieldBan, UserCheck, MessageSquare, MicOff, Mic, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import api from '@/api/homieshub';

const DirectMessageDialog = ({ recipient, isOpen, onOpenChange }) => {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !recipient?.username) return;
    setLoading(true);
    try {
      await api.post('/messages/send', { recipientUsername: recipient.username, content: message });
      toast({ title: 'Message Sent', description: `Direct message sent to @${recipient.username}.` });
      setMessage('');
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to send.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!recipient) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Message @{recipient.username}</DialogTitle>
          <DialogDescription>Send a private message to this user.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              className="min-h-[120px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={!message.trim() || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminUsers = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dmOpen, setDmOpen] = useState(false);
  const [dmRecipient, setDmRecipient] = useState(null);
  const limit = 20;

  const loadUsers = useCallback(async (q = searchTerm, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, page: p, limit } });
      if (data.status) {
        setUsers(data.result.items || []);
        setTotal(data.result.pagination?.total || 0);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load users.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page]);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers(searchTerm, 1);
  };

  const handleBan = async (user) => {
    try {
      const { data } = await api.post(`/admin/users/${user._id}/ban`);
      if (data.status) {
        setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isBanned: data.result.isBanned } : u));
        toast({ title: data.result.isBanned ? 'User Banned' : 'User Unbanned', description: `@${user.username}` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    }
  };

  const handleMute = async (user) => {
    try {
      const { data } = await api.post(`/admin/users/${user._id}/mute`);
      if (data.status) {
        setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isMuted: data.result.isMuted } : u));
        toast({ title: data.result.isMuted ? 'User Muted' : 'User Unmuted', description: `@${user.username}` });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">View, manage, and moderate user accounts.</p>
      </header>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="outline" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => loadUsers()} disabled={loading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No users found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div
                        className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                        onClick={() => navigate(`/profile/${user.username}`)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name || user.username}</p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? 'default' : user.isCreator ? 'secondary' : 'outline'}>
                        {user.isAdmin ? 'Admin' : user.isCreator ? 'Creator' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.isBanned && <Badge variant="destructive">Banned</Badge>}
                        {user.isMuted && <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Muted</Badge>}
                        {!user.isBanned && !user.isMuted && <Badge variant="outline">Active</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{(user.walletPoints || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/profile/${user.username}`)}>
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setDmRecipient(user); setDmOpen(true); }}>
                            <MessageSquare className="mr-2 h-4 w-4" /> Message
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMute(user)}>
                            {user.isMuted ? <><Mic className="mr-2 h-4 w-4" /> Unmute</> : <><MicOff className="mr-2 h-4 w-4" /> Mute</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className={user.isBanned ? '' : 'text-destructive focus:text-destructive'}
                            onClick={() => handleBan(user)}
                          >
                            {user.isBanned ? <><UserCheck className="mr-2 h-4 w-4" /> Unban</> : <><ShieldBan className="mr-2 h-4 w-4" /> Ban</>}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{total} users total</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DirectMessageDialog recipient={dmRecipient} isOpen={dmOpen} onOpenChange={setDmOpen} />
    </div>
  );
};

export default AdminUsers;
