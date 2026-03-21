import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Video, FileText, Activity, TrendingUp, MessageSquare, Send, ArrowRight, Expand, ChevronDown, ChevronUp, Gift, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const StatCard = ({ title, value, icon, description, onClick, className, loading }) => (
  <Card onClick={onClick} className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${className}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : value}
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const AdminGiftDialog = () => {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGift = async () => {
    if (!username || !amount) return;
    setLoading(true);
    try {
      const { data } = await api.post('/admin/users/gift-by-username', {
        username: username.replace('@', ''),
        points: Number(amount),
      });
      if (data.status) {
        toast({ title: 'Points Gifted!', description: `Gifted ${amount} points to @${username.replace('@', '')}.` });
        setUsername('');
        setAmount('');
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to gift points.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Gift Points</DialogTitle>
        <DialogDescription>Manually add points to a user's wallet.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="gift-username">Username</Label>
          <Input id="gift-username" placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gift-amount">Amount</Label>
          <Input id="gift-amount" type="number" placeholder="100" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleGift} disabled={!username || !amount || loading} className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
          Send Points
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const AdminMessageDialog = () => {
  const { toast } = useToast();
  const [recipientType, setRecipientType] = useState('all');
  const [specificUser, setSpecificUser] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message) return;
    setLoading(true);
    try {
      if (recipientType === 'specific' && specificUser) {
        await api.post('/messages/send', {
          recipientUsername: specificUser.replace('@', ''),
          content: message,
        });
      }
      toast({
        title: 'Message Sent',
        description: recipientType === 'all'
          ? 'Broadcast message sent to all users.'
          : `Message sent to @${specificUser}.`,
      });
      setMessage('');
      setSpecificUser('');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to send.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Send Admin Message</DialogTitle>
        <DialogDescription>Send a direct message to a specific user.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Recipient</Label>
          <Select value={recipientType} onValueChange={setRecipientType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users (Broadcast)</SelectItem>
              <SelectItem value="specific">Specific User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {recipientType === 'specific' && (
          <div className="space-y-2">
            <Label>Username</Label>
            <Input placeholder="@username" value={specificUser} onChange={(e) => setSpecificUser(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Message Content</Label>
          <Textarea
            placeholder="Type your message here..."
            className="min-h-[100px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSend} disabled={!message || (recipientType === 'specific' && !specificUser) || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Send Message
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState(null);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const { data } = await api.get('/admin/stats');
        if (data.status) setStats(data.result);
      } catch (err) {
        console.error('Failed to load admin stats', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
    }),
  };

  const toggleExpand = (section) => setExpandedSection((prev) => (prev === section ? null : section));

  const fmt = (n) => (n != null ? n.toLocaleString() : '—');

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of community performance and moderation.</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
                <Gift className="mr-2 h-4 w-4" />
                Gift Points
              </Button>
            </DialogTrigger>
            <AdminGiftDialog />
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </DialogTrigger>
            <AdminMessageDialog />
          </Dialog>
        </div>
      </header>

      <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Users', key: 'totalUsers', icon: <Users className="h-4 w-4 text-muted-foreground" />, desc: `+${stats?.recentSignups ?? 0} this week`, nav: '/admin/users' },
          { title: 'Total Videos', key: 'totalVideos', icon: <Video className="h-4 w-4 text-muted-foreground" />, desc: 'All published videos', nav: '/admin/videos' },
          { title: 'Total Posts', key: 'totalPosts', icon: <FileText className="h-4 w-4 text-muted-foreground" />, desc: 'Community threads & posts', nav: '/admin/content' },
          { title: 'Active Subscribers', key: 'activeSubscriptions', icon: <Activity className="h-4 w-4 text-muted-foreground" />, desc: 'Creator subscriptions', nav: '/admin/users' },
        ].map((card, i) => (
          <motion.div key={card.key} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <StatCard
              title={card.title}
              value={fmt(stats?.[card.key])}
              icon={card.icon}
              description={card.desc}
              loading={statsLoading}
              onClick={() => navigate(card.nav)}
            />
          </motion.div>
        ))}
      </motion.div>

      {stats?.pendingApplications > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center justify-between">
          <p className="text-sm text-yellow-600 font-medium">
            {stats.pendingApplications} creator application{stats.pendingApplications > 1 ? 's' : ''} pending review.
          </p>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/monetization')}>Review Now</Button>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/admin/users')}>
                <Users className="mr-2 h-4 w-4" /> Manage Users
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/admin/videos')}>
                <Video className="mr-2 h-4 w-4" /> Manage Videos
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/admin/monetization')}>
                <TrendingUp className="mr-2 h-4 w-4" /> Monetization
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/admin/content')}>
                <FileText className="mr-2 h-4 w-4" /> Community Posts
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Platform Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {[
                    ['Total Users', fmt(stats?.totalUsers)],
                    ['Total Videos', fmt(stats?.totalVideos)],
                    ['Total Reels', fmt(stats?.totalReels)],
                    ['Community Posts', fmt(stats?.totalPosts)],
                    ['Active Subscriptions', fmt(stats?.activeSubscriptions)],
                    ['Pending Applications', fmt(stats?.pendingApplications)],
                    ['New Users (7d)', fmt(stats?.recentSignups)],
                  ].map(([label, val]) => (
                    <TableRow key={label}>
                      <TableCell className="text-muted-foreground">{label}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {statsLoading ? '...' : val}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
