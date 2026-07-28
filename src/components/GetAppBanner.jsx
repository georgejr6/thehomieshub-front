import React, { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { trackEvent } from '@/lib/tracker';
import { IOS_APP_URL, ANDROID_APP_URL } from '@/lib/appLinks';

const DISMISS_KEY = 'hh_get_app_dismissed';

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

/**
 * Slim top nudge pushing mobile-web visitors to the native app — same
 * dismiss-for-session pattern as ConnectMembershipBanner. Links straight to
 * the matching store when we can detect the platform from the UA; falls
 * back to the App Store on desktop/unknown.
 */
const GetAppBanner = () => {
  const [dismissed, setDismissed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  if (dismissed) return null;

  const platform = isAndroid() ? 'android' : 'ios';
  const url = platform === 'android' ? ANDROID_APP_URL : IOS_APP_URL;

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  const handleOpen = () => {
    trackEvent('app_download_click', { target: { kind: 'app_store', id: platform }, meta: { surface: 'banner' } });
  };

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20 text-foreground">
      <div className="flex items-center gap-3 px-4 py-2 max-w-5xl mx-auto">
        <Smartphone className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs sm:text-sm flex-1 min-w-0">
          <span className="font-semibold">The Homies Hub is now on mobile.</span>{' '}
          <span className="text-muted-foreground hidden sm:inline">Get the app for the full experience.</span>
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpen}
          className="shrink-0 h-7 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground flex items-center hover:bg-primary/90 transition-colors"
        >
          Get the app
        </a>
        <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default GetAppBanner;
