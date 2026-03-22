import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Upload, Send, CheckCircle2, XCircle, AlertCircle, Loader2, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import api from '@/api/homieshub';

const statusIcon = {
  invited:        <CheckCircle2 className="w-4 h-4 text-green-500" />,
  already_exists: <AlertCircle className="w-4 h-4 text-yellow-500" />,
  error:          <XCircle className="w-4 h-4 text-red-500" />,
};

const statusLabel = {
  invited:        { label: 'Invited',        class: 'bg-green-500/10 text-green-500 border-green-500/20' },
  already_exists: { label: 'Already Exists', class: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  error:          { label: 'Error',           class: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const AdminInvite = () => {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const parseEmails = (raw) =>
    raw
      .split(/[\n,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'));

  const handleCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      // Grab anything that looks like an email from CSV
      const emails = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
      setEmailInput(prev => {
        const existing = new Set(parseEmails(prev));
        const newOnes = emails.filter(e => !existing.has(e.toLowerCase()));
        return prev ? `${prev}\n${newOnes.join('\n')}` : newOnes.join('\n');
      });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSend = async () => {
    const emails = parseEmails(emailInput);
    if (!emails.length) {
      toast({ title: 'No valid emails', description: 'Add at least one valid email address.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const { data } = await api.post('/admin/invite', { emails });
      setResults(data.result.results || []);
      const invited = data.result.results.filter(r => r.status === 'invited').length;
      toast({ title: `${invited} invite${invited !== 1 ? 's' : ''} sent!`, description: `Processed ${emails.length} email addresses.` });
      if (invited > 0) setEmailInput('');
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to send invites.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const emails = parseEmails(emailInput);
  const stats = results.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-3xl">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Invite Users</h1>
        <p className="text-muted-foreground mt-1">Bulk invite people to The Homies Hub. Each person gets an email with a direct link to join.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <CardTitle>Email List</CardTitle>
          </div>
          <CardDescription>Paste emails one per line, comma-separated, or upload a CSV file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`john@example.com\njane@example.com\nor comma separated: a@b.com, c@d.com`}
            className="min-h-[180px] font-mono text-sm"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Import CSV
              </Button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
              {emails.length > 0 && (
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {emails.length} email{emails.length !== 1 ? 's' : ''} ready
                </span>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={loading || emails.length === 0}
              className="bg-primary text-primary-foreground"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                : <><Send className="w-4 h-4 mr-2" /> Send Invites</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Results</CardTitle>
              <div className="flex gap-2">
                {Object.entries(stats).map(([status, count]) => (
                  <Badge key={status} className={statusLabel[status]?.class}>
                    {count} {statusLabel[status]?.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {statusIcon[r.status]}
                    <span className="text-sm font-mono">{r.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.username && <span className="text-xs text-muted-foreground">@{r.username}</span>}
                    <Badge variant="outline" className={statusLabel[r.status]?.class}>
                      {statusLabel[r.status]?.label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminInvite;
