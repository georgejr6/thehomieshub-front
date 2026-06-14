import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileSignature, ShieldCheck, FileLock2, ChevronLeft, ExternalLink, Loader2, Check, UploadCloud } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import myconsent from '@/api/myconsent';

const MYCONSENT_WEB = 'https://myconsent.me';

// Mirrors the form types on myconsent.me (config/agreements.js).
const FORM_TYPES = [
  {
    key: 'content-release',
    title: 'Content Release',
    icon: FileSignature,
    blurb: 'Grant permission to use photos, video, or likeness. Standard model/content release for creators.',
  },
  {
    key: 'general-consent',
    title: 'Consent Agreement',
    icon: ShieldCheck,
    blurb: 'A clear, mutual consent agreement — voluntary participation, boundaries, and withdrawal of consent.',
  },
  {
    key: 'nda',
    title: 'NDA',
    icon: FileLock2,
    blurb: 'Non-disclosure agreement to keep shared information, plans, or collaborations confidential.',
  },
];

const GOLD = '#F0B94D';
const emptyForm = () => ({ title: '', partyAName: '', partyAEmail: '', partyBName: '', partyBEmail: '', date: '', terms: '' });

const MyConsentModule = ({ isOpen, onOpenChange }) => {
  const { toast } = useToast();
  const [view, setView] = useState('intro'); // 'intro' | 'form'
  const [formType, setFormType] = useState(null);
  const [formData, setFormData] = useState(emptyForm());
  const [draftId, setDraftId] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [loadingDraft, setLoadingDraft] = useState(false);
  const saveTimer = useRef(null);
  const dirty = useRef(false);

  // On open, resume the most recent in-progress draft ("pick up where you left off").
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingDraft(true);
      try {
        const { data } = await myconsent.get('/drafts/latest');
        if (cancelled) return;
        const d = data?.draft;
        if (d) {
          setDraftId(d._id);
          setFormType(d.formType || null);
          setFormData({ ...emptyForm(), ...(d.payload || {}) });
          setView(d.formType ? 'form' : 'intro');
          toast({ title: 'Resumed your draft', description: 'Picked up where you left off.' });
        }
      } catch {
        /* no draft / not reachable — start fresh */
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, toast]);

  const persist = useCallback(async (nextType, nextData) => {
    setSaveState('saving');
    try {
      const { data } = await myconsent.post('/drafts', {
        id: draftId || undefined,
        formType: nextType,
        title: nextData.title || FORM_TYPES.find(f => f.key === nextType)?.title,
        payload: { ...nextData, formType: nextType },
        source: 'homies-web',
      });
      if (data?.id && !draftId) setDraftId(data.id);
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }, [draftId]);

  // Debounced autosave whenever the form changes.
  useEffect(() => {
    if (!dirty.current || view !== 'form' || !formType) return;
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(formType, formData), 800);
    return () => clearTimeout(saveTimer.current);
  }, [formData, formType, view, persist]);

  const update = (field, value) => {
    dirty.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickType = (key) => {
    setFormType(key);
    setView('form');
    dirty.current = true;
    persist(key, formData); // create the draft immediately
  };

  const reset = () => {
    setView('intro'); setFormType(null); setFormData(emptyForm());
    setDraftId(null); setSaveState('idle'); dirty.current = false;
  };

  const continueOnWeb = () => {
    const token = localStorage.getItem('access_token') || '';
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (draftId) params.set('draft', draftId);
    window.open(`${MYCONSENT_WEB}/?${params.toString()}`, '_blank', 'noopener');
  };

  const activeType = FORM_TYPES.find(f => f.key === formType);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200); }}>
      <DialogContent className="sm:max-w-[520px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5" style={{ color: GOLD }} />
            MyConsent.me
          </DialogTitle>
          <DialogDescription>
            Create consent forms, releases, and NDAs. Fill it out here — it auto-saves to your account, so you can
            finish and sign on any device.
          </DialogDescription>
        </DialogHeader>

        {loadingDraft ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : view === 'intro' ? (
          <div className="space-y-3 py-1">
            {FORM_TYPES.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => pickType(f.key)}
                  className="w-full text-left p-4 rounded-xl border border-border bg-secondary/20 hover:border-yellow-500/50 transition-colors flex gap-3 items-start"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${GOLD}1f` }}>
                    <Icon className="w-4 h-4" style={{ color: GOLD }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{f.blurb}</p>
                  </div>
                </button>
              );
            })}
            <p className="text-[11px] text-muted-foreground text-center pt-1">
              These documents are informational and not legal advice.
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <button onClick={() => setView('intro')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-3.5 h-3.5" /> All forms
            </button>

            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2">
                {activeType && <activeType.icon className="w-4 h-4" style={{ color: GOLD }} />}
                {activeType?.title}
              </p>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                {saveState === 'saving' && <><UploadCloud className="w-3 h-3 animate-pulse" /> Saving…</>}
                {saveState === 'saved' && <><Check className="w-3 h-3 text-green-500" /> Saved</>}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Document title</Label>
              <Input value={formData.title} onChange={(e) => update('title', e.target.value)} placeholder={activeType?.title} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Your name</Label>
                <Input value={formData.partyAName} onChange={(e) => update('partyAName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Your email</Label>
                <Input type="email" value={formData.partyAEmail} onChange={(e) => update('partyAEmail', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Other party name</Label>
                <Input value={formData.partyBName} onChange={(e) => update('partyBName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Other party email</Label>
                <Input type="email" value={formData.partyBEmail} onChange={(e) => update('partyBEmail', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={formData.date} onChange={(e) => update('date', e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Additional terms <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea rows={3} value={formData.terms} onChange={(e) => update('terms', e.target.value)} placeholder="Anything specific to include…" />
            </div>

            <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Generate &amp; sign on MyConsent.me.</span> Your progress is saved —
                continue on the website to use AI drafting, collect signatures, and download the signed PDF.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={continueOnWeb} className="text-black font-bold" style={{ background: GOLD }}>
            Continue on MyConsent.me <ExternalLink className="w-4 h-4 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MyConsentModule;
