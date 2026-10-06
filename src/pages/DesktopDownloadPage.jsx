import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Smartphone, Monitor, Download, CheckCircle2 } from 'lucide-react';
import StoreBadges from '@/components/StoreBadges';
import { trackDesktopDownload } from '@/components/DesktopAppRow';
import {
  DESKTOP_DOWNLOADS,
  MAC_APP_STORE_URL,
  isDesktopBrowser,
  isInDesktopApp,
  recommendedDownload,
} from '@/lib/desktopApp';

const SURFACE = 'download_page';

const PLATFORM_ROWS = [
  DESKTOP_DOWNLOADS.windows,
  DESKTOP_DOWNLOADS.mac,
  DESKTOP_DOWNLOADS.linux,
  DESKTOP_DOWNLOADS.linuxDeb,
];

/**
 * /desktop (and /download): every way to get The Homies. Mobile comes first
 * and stays the recommended download; the desktop builds are listed below it.
 */
const DesktopDownloadPage = () => {
  const env = useMemo(() => ({
    inApp: isInDesktopApp(),
    desktop: isDesktopBrowser(),
    rec: recommendedDownload(),
  }), []);

  return (
    <div className="container mx-auto py-10 px-4 max-w-3xl text-foreground">
      <Helmet>
        <title>Get the app | The Homies</title>
        <meta name="description" content="Get The Homies on iOS and Android, or on your computer for Windows, Mac and Linux." />
      </Helmet>

      <h1 className="text-3xl font-bold mb-2">Get The Homies</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        The Homies is best on your phone. On a computer? The desktop app is here too.
      </p>

      {/* Mobile first — the primary download. */}
      <section className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight">Mobile app</h2>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recommended</p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm mt-3 mb-4">
          The full experience: the feed, chat, music, live and push notifications, on iPhone and Android.
        </p>
        <StoreBadges surface={SURFACE} />
      </section>

      {/* Desktop — secondary. */}
      <section className="mb-8" id="desktop">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Also on desktop</h2>
        </div>

        {env.inApp ? (
          <p className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            You're already using The Homies desktop app.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm mb-4">
              Chat and notifications without keeping a browser tab open. Same account, same everything.
            </p>

            {env.desktop && env.rec && (
              <a
                href={env.rec.url}
                onClick={() => trackDesktopDownload(env.rec, SURFACE)}
                className="mb-5 inline-flex h-10 items-center gap-2 rounded-md border border-primary/40 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <Download className="h-4 w-4" /> Download for {env.rec.label}
              </a>
            )}

            <ul className="divide-y divide-border rounded-lg border border-border">
              {PLATFORM_ROWS.map((d) => (
                <li key={d.key} className="flex items-center gap-3 p-3 sm:p-4">
                  <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {d.label}
                      {env.rec && env.rec.key === d.key && (
                        <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-primary">Your computer</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{d.note} · {d.file}</div>
                  </div>
                  <a
                    href={d.url}
                    onClick={() => trackDesktopDownload(d, SURFACE)}
                    className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-secondary transition-colors"
                    aria-label={`Download for ${d.label}`}
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-3 p-3 sm:p-4">
                <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Mac App Store</div>
                  <div className="text-xs text-muted-foreground">{MAC_APP_STORE_URL ? 'Install and update through the App Store' : 'Coming soon'}</div>
                </div>
                {MAC_APP_STORE_URL ? (
                  <a
                    href={MAC_APP_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackDesktopDownload({ key: 'mac_app_store' }, SURFACE)}
                    className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    Open
                  </a>
                ) : (
                  <span className="shrink-0 inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-muted-foreground opacity-60" aria-disabled="true">
                    Soon
                  </span>
                )}
              </li>
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default DesktopDownloadPage;
