import React from 'react';
import { Apple, Play } from 'lucide-react';
import { trackEvent } from '@/lib/tracker';
import { IOS_APP_URL, ANDROID_APP_URL } from '@/lib/appLinks';

/**
 * Renders the two app store badges. `surface` identifies where the click came
 * from (header/footer/banner) so app_download_click events can be broken down
 * by which CTA is actually converting.
 */
const StoreBadges = ({ surface, className = '', size = 'default' }) => {
  const handleClick = (platform) => {
    trackEvent('app_download_click', { target: { kind: 'app_store', id: platform }, meta: { surface } });
  };

  const badgeClass =
    size === 'sm'
      ? 'gap-1.5 px-2.5 py-1.5 text-xs'
      : 'gap-2 px-3.5 py-2 text-sm';
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <a
        href={IOS_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => handleClick('ios')}
        className={`inline-flex items-center rounded-lg bg-white text-black hover:bg-white/90 transition-colors font-medium ${badgeClass}`}
      >
        <Apple className={iconClass} />
        <span>Download on the App Store</span>
      </a>
      <a
        href={ANDROID_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => handleClick('android')}
        className={`inline-flex items-center rounded-lg bg-white text-black hover:bg-white/90 transition-colors font-medium ${badgeClass}`}
      >
        <Play className={iconClass} />
        <span>Get it on Google Play</span>
      </a>
    </div>
  );
};

export default StoreBadges;
