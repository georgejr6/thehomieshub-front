import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, FileSignature, ArrowRight, LayoutGrid } from 'lucide-react';
import MyConsentModule from '@/components/apps/MyConsentModule';

// ── App registry ──────────────────────────────────────────────────────────
// Add an entry here to surface a new ecosystem app. `action: 'navigate'` opens
// an in-app route; `action: 'modal'` opens an embedded module.
// NOTE: keep this list to explicitly approved apps only.
const APPS = [
  {
    key: 'directorybro',
    name: 'DirectoryBro',
    tagline: 'AI trip planning, flights & local spots',
    description: 'Plan full trips, find the cheapest flights, and get the best-value hotels, food, and nightlife — powered by the DirectoryBro travel AI.',
    icon: Compass,
    accent: '#F0B94D',
    action: 'navigate',
    to: '/AI?bot=directorybro',
    cta: 'Open DirectoryBro',
  },
  {
    key: 'myconsent',
    name: 'MyConsent.me',
    tagline: 'Consent forms, releases & NDAs',
    description: 'Create content releases, consent agreements, and NDAs. Fill them out here — they auto-save so you can finish and sign on any device.',
    icon: FileSignature,
    accent: '#22d3ee',
    action: 'modal',
    modal: 'myconsent',
    cta: 'Open MyConsent',
  },
];

const MyAppsPage = () => {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(null);

  const launch = (app) => {
    if (app.action === 'navigate') navigate(app.to);
    else if (app.action === 'modal') setOpenModal(app.modal);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <LayoutGrid className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">My Apps</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Your Homies Hub toolkit — included with your membership.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {APPS.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.key}
              onClick={() => launch(app)}
              className="group text-left rounded-2xl border border-border bg-card hover:border-primary/40 transition-all p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${app.accent}1f` }}>
                  <Icon className="w-5 h-5" style={{ color: app.accent }} />
                </div>
                <div>
                  <p className="font-bold">{app.name}</p>
                  <p className="text-xs text-muted-foreground">{app.tagline}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{app.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: app.accent }}>
                {app.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          );
        })}
      </div>

      <MyConsentModule isOpen={openModal === 'myconsent'} onOpenChange={(o) => setOpenModal(o ? 'myconsent' : null)} />
    </div>
  );
};

export default MyAppsPage;
