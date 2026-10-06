import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Monitor, Download } from 'lucide-react';
import { trackEvent } from '@/lib/tracker';
import {
  DESKTOP_PAGE_PATH,
  isDesktopBrowser,
  isInDesktopApp,
  otherDownloads,
  recommendedDownload,
} from '@/lib/desktopApp';

export const trackDesktopDownload = (build, surface) => {
  trackEvent('app_download_click', { target: { kind: 'desktop_app', id: build?.key || 'unknown' }, meta: { surface } });
};

/**
 * Secondary "Also on desktop" row that sits UNDER the mobile store badges
 * wherever the site offers the app. Mobile stays the primary download: this
 * row is smaller and outlined. Hidden inside the desktop app itself; on
 * phones/tablets it's just a quiet link to /desktop.
 */
const DesktopAppRow = ({ surface, className = '', bordered = true, onNavigate }) => {
  const env = useMemo(() => ({
    inApp: isInDesktopApp(),
    desktop: isDesktopBrowser(),
    rec: recommendedDownload(),
  }), []);

  if (env.inApp) return null;

  const wrap = `${bordered ? 'border-t border-border pt-3' : ''} ${className}`;
  const heading = (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Also on desktop</p>
  );

  // Phones / tablets / ChromeOS: no file to hand them, just point at the page.
  if (!env.desktop || !env.rec) {
    return (
      <div className={wrap}>
        {heading}
        <Link
          to={DESKTOP_PAGE_PATH}
          onClick={onNavigate}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
        >
          <Monitor className="h-3.5 w-3.5" /> Windows, Mac &amp; Linux
        </Link>
      </div>
    );
  }

  const others = otherDownloads(env.rec);

  return (
    <div className={wrap} data-testid="desktop-app-row">
      {heading}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <a
          href={env.rec.url}
          onClick={() => trackDesktopDownload(env.rec, surface)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Download className="h-3.5 w-3.5" /> Download for {env.rec.label}
        </a>
        <span className="text-xs text-muted-foreground">
          {others.map((d, i) => (
            <React.Fragment key={d.key}>
              {i > 0 && ' · '}
              <a href={d.url} onClick={() => trackDesktopDownload(d, surface)} className="hover:text-primary">{d.label}</a>
            </React.Fragment>
          ))}
          {' · '}
          <Link to={DESKTOP_PAGE_PATH} onClick={onNavigate} className="hover:text-primary">All options</Link>
        </span>
      </div>
    </div>
  );
};

export default DesktopAppRow;
