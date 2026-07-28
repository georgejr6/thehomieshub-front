import React from 'react';
import { trackEvent } from '@/lib/tracker';
import { IOS_APP_URL, ANDROID_APP_URL } from '@/lib/appLinks';

// Official Apple / Google badge-generator assets — not hand-drawn recreations.
const APPLE_BADGE = 'https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83';
const GOOGLE_BADGE = 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

/**
 * Renders the two official app store badges. `surface` identifies where the
 * click came from (header/footer/banner) so app_download_click events can be
 * broken down by which CTA is actually converting.
 */
const StoreBadges = ({ surface, className = '', size = 'default' }) => {
  const handleClick = (platform) => {
    trackEvent('app_download_click', { target: { kind: 'app_store', id: platform }, meta: { surface } });
  };

  const h = size === 'sm' ? 'h-9' : 'h-11';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer" onClick={() => handleClick('ios')}>
        <img src={APPLE_BADGE} alt="Download on the App Store" className={`${h} w-auto`} />
      </a>
      <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer" onClick={() => handleClick('android')}>
        <img src={GOOGLE_BADGE} alt="Get it on Google Play" className={`${h} w-auto`} />
      </a>
    </div>
  );
};

export default StoreBadges;
