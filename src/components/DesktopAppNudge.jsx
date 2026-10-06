import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast as showToast, useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { trackDesktopDownload } from '@/components/DesktopAppRow';
import {
  DESKTOP_PAGE_PATH,
  beginNudgeSession,
  isDesktopBrowser,
  lastMobilePromptAt,
  nudgeEligibility,
  readNudgeState,
  recommendedDownload,
  writeNudgeState,
} from '@/lib/desktopApp';

const CHECK_EVERY_MS = 15 * 1000;
const MOBILE_MODAL_DISMISS_KEY = 'hh_get_app_modal_dismissed'; // GetAppSignedOutModal

const readSession = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };

// A call or broadcast in progress (future call features can set
// window.__hhCallActive / __hhStreamActive), or a video playing with sound.
function mediaActive() {
  if (typeof window === 'undefined') return false;
  if (window.__hhCallActive || window.__hhStreamActive) return true;
  try {
    return Array.from(document.querySelectorAll('video')).some((v) => !v.paused && !v.ended && !v.muted && v.currentTime > 0);
  } catch { return false; }
}

// Don't land on top of an open dialog / sheet / mobile app prompt.
function overlayOpen() {
  try { return !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'); } catch { return false; }
}
function mobilePromptOnScreen() {
  try { return !!document.querySelector('[data-hh-mobile-prompt]'); } catch { return false; }
}

/**
 * Occasional "The Homies desktop app is here" toast for returning visitors on
 * desktop browsers. All the rules live in nudgeEligibility() (lib/desktopApp).
 * Renders nothing itself — it uses the site's toast.
 */
const DesktopAppNudge = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { toasts } = useToast();
  const sessionRef = useRef(null);
  const shownRef = useRef(false);
  const live = useRef({});
  live.current = { user, pathname: location.pathname, toastCount: toasts.length };

  useEffect(() => {
    if (!isDesktopBrowser()) return undefined;
    sessionRef.current = beginNudgeSession(Date.now());

    const check = () => {
      if (shownRef.current || !sessionRef.current) return;
      const { user: u, pathname, toastCount } = live.current;
      if (toastCount > 0 || overlayOpen()) return;
      const now = Date.now();
      const result = nudgeEligibility({
        now,
        state: readNudgeState(),
        sessionStartedAt: sessionRef.current.sessionStartedAt,
        desktopBrowser: isDesktopBrowser(),
        signedIn: !!u,
        pathname,
        mediaActive: mediaActive(),
        mobileBannerVisible: mobilePromptOnScreen(),
        mobilePromptPending: !u && readSession(MOBILE_MODAL_DISMISS_KEY) !== '1',
        lastMobilePromptAt: lastMobilePromptAt(),
      });
      if (!result.ok) return;
      shownRef.current = true;
      show(now);
    };

    const show = (now) => {
      writeNudgeState({ lastShownAt: now });
      const rec = recommendedDownload();
      const href = rec ? rec.url : DESKTOP_PAGE_PATH;
      let downloaded = false;
      const t = showToast({
        title: 'The Homies desktop app is here',
        description: 'Chat & notifications without a browser tab.',
        duration: Infinity,
        action: (
          <ToastAction asChild altText="Download The Homies desktop app">
            <a
              href={href}
              onClick={() => {
                downloaded = true;
                writeNudgeState({ downloaded: true });
                trackDesktopDownload(rec, 'desktop_nudge');
              }}
            >
              Download
            </a>
          </ToastAction>
        ),
        onOpenChange: (open) => {
          if (open) return;
          if (!downloaded) writeNudgeState({ dismissals: readNudgeState().dismissals + 1 });
          t.dismiss();
        },
      });
    };

    const id = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, []);

  return null;
};

export default DesktopAppNudge;
