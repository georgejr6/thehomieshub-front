import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Search, Loader2, Calendar, DollarSign, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from '@/api/homieshub';

const statusBadge = (status) => {
  if (status === 'approved') return <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
};

const AdminMonetization = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadApplications = useCallback(async (status = filterStatus, p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/monetization', { params: { status, page: p, limit } });
      if (data.status) {
        setApplications(data.result.items || []);
        setTotal(data.result.pagination?.total || 0);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load applications.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page]);

  useEffect(() => {
    loadApplications(filterStatus, 1);
    setPage(1);
  }, [filterStatus]);

  const handleApprove = async (app) => {
    setIsProcessing(true);
    try {
      const { data } = await api.post(`/admin/monetization/${app._id}/approve`);
      if (data.status) {
        setApplications((prev) => prev.filter((a) => a._id !== app._id));
        toast({ title: 'Creator Approved', description: `@${app.user?.username} is now a creator.`, className: 'bg-green-600 text-white border-none' });
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to approve.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedApp) return;
    setIsProcessing(true);
    try {
      const { data } = await api.post(`/admin/monetization/${selectedApp._id}/reject`, { reason: rejectionReason });
      if (data.status) {
        setApplications((prev) => prev.filter((a) => a._id !== selectedApp._id));
        toast({ title: 'Application Rejected', description: `@${selectedApp.user?.username} notified.` });
        setRejectDialogOpen(false);
        setSelectedApp(null);
        setRejectionReason('');
      }
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to reject.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = applications.filter((app) => {
    const q = searchTerm.toLowerCase();
    return app.user?.username?.toLowerCase().includes(q) || app.user?.email?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-primary" />
          Creator Monetization
        </h1>
        <p className="text-muted-foreground mt-1">Review and manage creator applications.</p>
      </header>

      <Tabs value={filterStatus} onValueChange={setFilterStatus}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search applicants..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => loadApplications()} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {['pending', 'approved', 'rejected'].map((status) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg capitalize">{status} Applications</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No {status} applications.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        {status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((app) => (
                        <TableRow key={app._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={app.user?.avatarUrl} />
                                <AvatarFallback>{app.user?.username?.[0]?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{app.user?.name || app.user?.username}</p>
                                <p className="text-xs text-muted-foreground">@{app.user?.username}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{app.user?.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(app.status)}</TableCell>
                          {status === 'pending' && (
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApprove(app)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => { setSelectedApp(app); setRejectionReason(''); setRejectDialogOpen(true); }}
                                  disabled={isProcessing}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">{total} applications total</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setPage((p) => Math.max(1, p - 1)); loadApplications(filterStatus, page - 1); }} disabled={page === 1 || loading}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); loadApplications(filterStatus, page + 1); }} disabled={page === totalPages || loading}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting @{selectedApp?.user?.username}'s application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="e.g. Insufficient content, policy violation..."
              className="min-h-[100px]"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmReject} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMonetization;
