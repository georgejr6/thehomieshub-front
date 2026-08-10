# The Homies Hub — Frontend (CLAUDE.md)

> Auto-read by Claude Code on every session. Keep this file updated after each meaningful change.

---

## Project Overview

**Repo:** `thehomieshub-front`
**Stack:** React 18 + Vite, Tailwind CSS, shadcn/ui, React Router v6, Framer Motion
**Live API:** `https://backend.thehomies.app/api` (see `src/api/homieshub.js`)
**Dev server:** `npm run dev` → port 3000

---

## Key Architecture

### API Layer
- `src/api/homieshub.js` — Axios instance pointing to `https://backend.thehomies.app/api`. Attaches `Bearer` token from `localStorage.access_token` on every request.
- `src/lib/frogzApi.js` — External "Freaky Frogz" clip API. Only loads for users with `freakyfrogz_fan` or `freakyfrogz` tag.
- `src/lib/digitvlApi.js` — Digitvl content API (separate service).

### State / Contexts
| Context | File | Purpose |
|---|---|---|
| `AuthContext` | `src/contexts/AuthContext.jsx` | User auth, `isPremium`, `triggerLockedFeature` |
| `ContentContext` | `src/contexts/ContentContext.jsx` | Feed data, likes, saves, comments |
| `MediaContext` | `src/contexts/MediaContext.jsx` | Music player, `isPlaying`, `currentVideo` |
| `WalletContext` | `src/contexts/WalletContext.jsx` | Crypto wallet state |
| `WagerContext` | `src/contexts/WagerContext.jsx` | Wager/betting state |

### Video Feed System
The main feed is a TikTok-style vertical scroll. Data flows:
1. `ContentContext` fetches `/user/reels` + `/user/videos` (limit 50 each) + optional frogz clips
2. Results are shuffled and stored as `verticalPosts`
3. `VerticalVideoFeed` (`src/components/VerticalVideoFeed.jsx`) renders `VerticalVideo` per item
4. `VerticalVideoFeed` auto-loops: appends reshuffled posts when within 3 of the end

### Key Video Components
| Component | Role |
|---|---|
| `VerticalVideo.jsx` | Main TikTok-style feed card — handles autoplay, gates, Mux player |
| `VerticalVideoFeed.jsx` | Feed container — IntersectionObserver tracks visible index, manages infinite loop |
| `VideoPlayer.jsx` | Full-screen media mode player (used in `/media/:id`) |
| `VideoPost.jsx` | Grid-style video card (used on profile pages) |

---

## Mux Video Integration

All videos use **Mux** for playback via `@mux/mux-player-react`.

### Playback ID Sources
- `post.muxPlaybackId` — primary
- `post.videoUrl` — fallback (sometimes stores the playbackId directly)

### Poster thumbnails
Generated on the fly: `https://image.mux.com/{playbackId}/thumbnail.jpg?time=1`

### Critical: `preload` strategy (updated 2026-04-12)
**Problem that existed before:** All MuxPlayer instances mounted with `preload="metadata"`, causing 50+ simultaneous connections to Mux CDN → browser connection limit saturation → 2-3 minute delay before any video played.

**Current behavior:**
- `VerticalVideo.jsx` — `preload={isVisible ? "auto" : "none"}` — only the visible video loads
- `VideoPost.jsx` (grid cards) — `preload="none"` always — loads only on user play
- `VideoPlayer.jsx` (full-screen) — `preload="auto"` always — intentional, it's the active player

---

## Video Gate System (VerticalVideo.jsx)

Two gates control how much non-paying/non-subscribed users can watch:

### 1. Subscriber Preview Gate (60 seconds)
- Constant: `PREVIEW_LIMIT_SECONDS = 60`
- Applies to: `post.isSubscriberOnly && !isMember`
- `isMember = isPremium || user.tags.includes('member')`
- On expire: pauses video, shows `MembershipUpgradeModal`

### 2. Long-Video Media Mode Gate (3 minutes)
- Constant: `LONG_VIDEO_LIMIT = 180`
- Applies to: `video.duration > 180` — nudges users to open full media mode
- On expire: pauses video, shows media mode CTA overlay

### Elapsed time tracking
`playbackStartRef` stores where playback actually began. `elapsed = currentTime - playbackStartRef`. This is critical because `pickStartTime` starts videos mid-way through.

### IMPORTANT BUG FIX (2026-04-12)
**Bug:** Gates fired too early (e.g. after 15 seconds instead of 60+) when a user scrolled away from a video and scrolled back. `playbackStartRef` was reset to `null` on scroll-away, but `currentTime` was not reset. On return: `elapsed = currentTime - 0 = currentTime`, which was already past the gate threshold.

**Fix:** In the scroll-away reset effect, `videoRef.current.currentTime = 0` is now explicitly set. On return the video starts fresh and gates count correctly from zero.

---

## Random Start Time System (`pickStartTime`)

Videos in the feed start at a random position to keep the feed feeling fresh on re-visits.

- Short videos (< 20s) always start from 0
- Longer videos are divided into 60-second windows
- `sessionWindowMap` (module-level `Map`) tracks which windows were already shown per video per session
- Once all windows are seen, the map resets and they're all eligible again
- **Only runs when the video is visible** — non-visible videos skip the seek to avoid wasted HLS segment fetches (fixed 2026-04-12)

---

## Access Control (Blur / Lock Logic)

| Condition | Behavior |
|---|---|
| `post.isNSFW` | Blurs video, shows NSFW overlay. Tap to unlock (no premium needed) |
| `post.isSubscriberOnly && !isMember` | Allows 60-second preview, then upgrade modal |
| `video.duration > 180 && not media mode` | Allows 3 minutes, then nudge to open media mode |

`isBlurred = post.isNSFW && !isUnlocked` — NSFW blur is purely local state, resets on scroll-away.

---

## Pages Reference

| Route | Component | Notes |
|---|---|---|
| `/` | `HomePage.jsx` | Main feed with stories + vertical video |
| `/explore` | `ExplorePage.jsx` | Explore/search feed |
| `/reels` | `ReelsPage.jsx` | Reels-only feed |
| `/watch/:postId` | `WatchPage.jsx` | Watch page — loads creator content or global feed |
| `/media/:id` | `MediaMode/MediaApp.jsx` | Full-screen media player |
| `/profile/:username` | `UserProfilePage.jsx` | User profile with video grid |
| `/studio` | `CreatorStudioPage.jsx` | Creator upload + management |
| `/wagers` | `WagersPage.jsx` | Betting/wager system |
| `/wallet` | `WalletPage.jsx` | Crypto wallet |
| `/live` | `LivePage.jsx` | Live streaming |

---

## Recent Changes Log

### 2026-08-10 (later) — Creator Studio re-enabled + dedicated Trips module
- **[STRUCTURE] Creator Studio live again** (`/creator-studio`, logged-in only). Refocused on content mgmt + analytics + engagement + ecommerce/prices. **Trips tab removed** (now its own module). Honors `?tab=` deep-links. Removed placeholder chart + mock comments from Overview.
- **[FEAT] Homies Studio card** (`components/CreatorStudio/HomiesStudioCard.jsx`): preview of clip/edit features + button that opens `studio.thehomies.app` in a new tab (membership nudge; no hardcoded pricing).
- **[FEAT] Trips module** (`pages/TripsPage.jsx`, route `/trips`; `/experiences`→`/trips`): dedicated experience builder — attach existing posts as moments (`/user/my-content`, photo posts) or add new photos / create post / go live; set price → trip_guide product. Backend `createTrip` accepts `attachedPostIds`.
- **[NAV] Sidebar** "Earn" section: added Trips + Creator Studio (logged-in).
- **[FIX] ContentContext** derives real trip title from first line of text (was always "Trip"); `TripView` strips the duplicate title line. `MonetizationTab` trips link → `/trips`.
- Note: `components/CreatorStudio/TripsTab.jsx` is now unused (superseded by `/trips`).

### 2026-08-10 — Trip monetization + Stripe Connect payout onboarding
- **[FEAT] Trip photos + pricing** (`PostModal.jsx` `TripForm`): multi-photo picker (moments) + optional price → creates a linked `trip_guide` product on post. Uploads via `/files/upload` (images only; video TODO via Mux).
- **[FEAT] Trip paywall UI**: `TripView.jsx` rewritten — real photo gallery + locked state with "Unlock for $X" → `/marketplace/checkout`; removed mock timeline/follow stubs. `FeedItem.jsx` shows 🔒/✓ price badge on paid trip cards. `ContentContext.jsx` maps `locked`/`unlock`.
- **[FEAT] PayoutConnect stepper** (`components/CreatorStudio/PayoutConnect.jsx`): status-aware Stripe Connect onboarding (status → connect-link redirect → dashboard-link). Surfaced on **Wallet → Creator Earnings** (`WalletPage.jsx`; removed the premium gate + mock payout dialog/history) and in `MonetizationTab.jsx` (replaced the fully-mocked localStorage flow with real dashboard stats).
- **[NOTE]** Creator Studio route (`/creator-studio`) is still redirected to `/go-live` (App.jsx) — TripsTab/MonetizationTab there remain unreachable; monetization now lives in PostModal + Wallet.

### 2026-07-16 (session 9) — Revenue + Growth + At-risk + Alerts + helper tooltips
- **[FEAT] Revenue page** (`AdminRevenue.jsx`, route `/admin/revenue`, sidebar Business → Wallet). Est. MRR (tier counts × price), paying members, one-off revenue (window + all-time), by-source bars, MRR-by-tier, daily revenue chart, recent transactions. Backend `GET /admin/revenue?days=` sums Order/VideoPurchase/SongLicense/IAPPurchase/Fundraiser from Mongo (subscription MRR estimated since amounts live in Stripe).
- **[FEAT] Growth tab** (Analytics): DAU/WAU/MAU + stickiness, visitor→signup→paid funnel, daily-actives chart, landing→conversion table. Backend `GET /track/funnel`, `GET /track/actives` (+ existing `/track/landing`).
- **[FEAT] At-risk tab** (Analytics): dormant members (no visit in 7/14/30d, paying-only toggle) with one-click Re-engage (DM/push) via `ReengageDialog`. Backend `GET /admin/members/dormant`.
- **[FEAT] Recent activity feed** on the dashboard (new members / watch returns / pending applications). Backend `GET /admin/alerts` composes from existing collections (no new write path).
- **[UI] Helper tooltips** — new `InfoTip` in the glass kit + `info` prop on `StatTile`; used across the new views to explain every metric.

### 2026-07-16 (session 8) — Analytics as a standalone /admin page
- **[FEAT]** New `/admin/analytics` route + `AdminAnalytics.jsx` page (in AdminLayout, admin-only) that renders the SAME `MediaAnalytics` component as `/media/admin` — so the full analytics (Listeners/Superfans/Songs/Videos/Traffic + drill-downs) is available in the standalone admin panel too, and the two never drift. Added an **Analytics** sidebar item (Overview group); dashboard Analytics shortcuts now point to `/admin/analytics`.

### 2026-07-16 (session 7) — Clickable stat cards → drill-down analytics
- **[FEAT] Backend** `GET /track/timeseries?days=` — daily visitors/members/anon/plays/views/listenMs for charts.
- **[FEAT] Frontend** — the Audience stat tiles (Visitors/Members/Anonymous/Total Plays) are now clickable → `MetricDetailDialog` with a per-day bar chart (`MiniBarChart`, no chart lib) + the relevant breakdown list (visitors/members/anon lists → open profile on click; Total Plays → top songs). Extracted `VisitorRow` (reused by the list + drill-downs).

### 2026-07-16 (session 6) — Watchlist + Superfans + message/push from profile
- **[FEAT] Notify-on-return watchlist** — in an audience profile, "Notify me when they return" toggles a watch (account or IP) via `POST/DELETE /track/audience/watch`. Backend `POST /api/track` ingest pings admin (Telegram, 6h throttle) on the watched visitor's next `session_start`. New model `AudienceWatch`.
- **[FEAT] Superfans tab** — `Audience` component now takes `mode`; Superfans fetches `/track/audience?sort=engagement` (most listen time/plays first) with rank numbers. Backend audience list accepts `sort=engagement|recent`.
- **[FEAT] Message / push a member from their profile** — for signed-in visitors, the profile has a composer: "Send message" (`/messages/send`) and "Send push" (`/admin/push/send` with their username). Anonymous visitors show the notify-on-return note instead.

### 2026-07-16 (session 5) — Audience profiles (Listeners tab)
- **[FEAT] Backend** (`routes/track.js`, admin-gated): `GET /track/audience` (one row per visitor — account by userSub, else anonymous by IP — with plays/views/listen time/last seen) + `GET /track/audience/profile?type=user|anon&id=` (that visitor's songs, videos, recent activity timeline, sessions, linked accounts/known IPs, traffic source, `canPush`).
- **[FEAT] Frontend** (`admin/MediaAnalytics.jsx`): new **Listeners** tab (now the default) — searchable list of everyone (members + anon by IP); click any row → `AudienceProfileDialog` showing stat pills, songs they play, videos they watch, a recent-activity timeline, linked accounts, traffic source, and push guidance (members → link to /admin/push; anon → note that backend already alerts on dormant-IP return).

### 2026-07-16 (session 4) — /media/admin immersive + management tools
- **[UI] Immersive panel** — MediaAdminPanel inline container widened to `max-w-[1700px]` + `min-h-[calc(100vh-7rem)]`. Sits inside `#media-scroller` under the fixed nav (`pt-16` wrapper in MediaApp), so header/footer/mobile menu are never covered.
- **[FEAT] Inline performance numbers + sort** — Music tab shows real play counts per track (from `/track/music/songs?days=365`) + sort (Most played / A–Z / Z–A). Video Library shows view counts per item (from `/track/media/videos?days=365`) + sort (Newest / Most viewed / A–Z).
- **[FEAT] Bulk video actions** — multi-select (per-row + select-all) with a sticky bulk bar: Make public, Make subscribers-only, Add to category, Delete. Loops existing per-item `/admin/videos/:id` + `/admin/media-categories/:id` endpoints.
- **[FEAT] CSV export** — each analytics table (songs/videos/traffic) has an Export CSV button (client-side).

### 2026-07-16 (session 3) — Media-mode admin (/media/admin) got the updates
- **IMPORTANT surface note:** `/media/admin` renders `MediaMode/MediaAdminPanel.jsx` (via `MediaApp` admin tab), NOT `admin/AdminMediaManager.jsx` (which is `/admin/media`). They're near-duplicate "Media Manager" UIs. George checks **/media/admin**, so apply media-manager changes THERE (or both).
- **[FIX] MediaAdminPanel MusicTab** now plays through the shared `MusicPlayer` bar (`MediaContext.playMedia`) instead of its own hidden `<audio>` (same fix as AdminMediaManager).
- **[FEAT] Analytics tab** added to MediaAdminPanel (renders `MediaAnalytics`).
- **[UI] Glass redesign** of MediaAdminPanel (frosted panel, big title, explanatory sub-copy, glass tab bar) + `MediaAnalytics` now uses the glass kit with interactive `StatTile` headline stats (plays/views, audience, watch/listen time, traffic sessions/visitors/signups) + a Live-now strip.

### 2026-07-16 (session 2) — Admin panel glass redesign
- **[UI] Glass admin design kit** (`components/admin/glass.jsx`, new) — reusable `GlassPanel`, `StatTile` (big interactive stat w/ accents + trend + click-through), `SectionTitle`, `MetricPill`. Foundation for all admin pages to share one clean frosted-glass look. Accent classes are STATIC maps (Tailwind JIT can't see interpolated class names — don't build `bg-${x}` strings).
- **[UI] AdminLayout** (`admin/AdminLayout.jsx`) — glass sidebar with grouped nav (Overview/Content/Community/Business), ambient gradient backdrop, bigger text, glow active states. Logout is a plain button now (was shadcn Button).
- **[UI] AdminDashboard** (`admin/AdminDashboard.jsx`) — rebuilt as an interactive hub: big glass stat tiles (click-through), a **Live snapshot** panel (auto-refreshing `/track/live` + top song `/track/music/songs` + top traffic `/track/sources`), quick-action tiles, and a platform summary grid. Explanatory sub-copy throughout. Gift/Message dialogs unchanged.
- Next: apply the same glass kit to the other admin pages (Users/Content/Visitors/Media) as we build more management + analytics features.

### 2026-07-16 — Media mode: shared admin player, analytics tab, song pages, popular-next
- **[FIX] Admin Media Manager plays through the shared player** (`admin/AdminMediaManager.jsx`)
  - The Music tab used its own hidden `<audio>` element, so admin previews played *independently* of the bottom `MusicPlayer` bar. Now it calls `MediaContext.playMedia()` — one thing plays at a time and the visible bar reflects the admin's click. (The other admin page `AdminMusicManager.jsx` still uses its own `PreviewButton` audio for the playlist-editor previews — left as-is for now.)
- **[FEAT] Admin-only Analytics tab** (`admin/MediaAnalytics.jsx`, new; added as a tab in `AdminMediaManager`)
  - Sub-tabs Songs / Videos / Traffic + a "Live now" strip. Click any row → who watched/listened with **IP**, play/view counts, and watch/listen time. Admin-gated by the existing `/admin/media` route guard (`user?.isAdmin`).
  - Backend: `routes/track.js` gained `GET /track/media/videos`, `GET /track/media/video/:id`, `GET /track/sources` (referrer→source buckets). All under the existing admin gate. (Songs analytics `/track/music/songs` + `/track/music/song/:id` already existed.)
- **[FEAT] Dedicated song page** `/song/:id` (+ `/track/:id`) (`components/MediaMode/SongPage.jsx`, new)
  - Share links land here, auto-play the track, show cover/artist/actions + an "Up next · Popular" list. Backend OG (`routes/og.js`) now bounces browsers to `/song/:id` instead of `/media?track=`. Uses `musicApi.getTrack(id)` (new) → `GET /api/music/track/:id`.
- **[FEAT] Auto-continue by most-popular + loop toggle** (`contexts/MediaContext.jsx`, `MusicPlayer.jsx`)
  - When a song ends and repeat is off, playback auto-advances to the next **most-popular** unheard track (ranked via `/music/top` + catalog). Added a `repeatOne` loop toggle (Repeat button in the player bar + on the song page). Explicit skip-forward stays sequential.
- Note: digitvl.app is meant to mirror this media mode ("skin of Homies media", DIGITVL red, backend.thehomies.app) — delivery mechanism pending decision. This app is the source of truth.

### 2026-07-07 (session 3)
- **[UX] Home tab groups video vs music** (`MediaApp.jsx`)
  - Home now renders a **Watch** section (all video rows) then a **Listen** section (all music rows), each with a `SectionHeading`, instead of interleaving music between video rows. Videos/Music/Likes tabs already show one content type.
- **[PERF] Stopped fetching Media library on every page load** (`MediaContext.jsx`)
  - `hhVideos` (`/user/videos` + `/user/reels`) is only used in Media Mode but was fetched on provider mount → 2 heavy calls on *every* app page-load app-wide. Removed the provider-mount fetch; `MediaApp` still fetches on open. Also dropped `limit` 100 → 40.
- **[PERF] One "Add to playlist" modal per row, not per card** (`MediaRow.jsx`)
  - `AddToPlaylistModal` (Radix Dialog) was instantiated inside every `MediaCard` (hundreds of dialog trees across the page). Hoisted to a single modal per `MediaRow`, opened via `onAddToPlaylist(item)`.
- Note: full video/music catalog still loads on provider mount because `trendingVideos` is used by `ExplorePage` and the music catalog primes the persistent player — left as-is.

### 2026-07-07 (session 2)
- **[FIX] Media Mode tabs not switching (Home/Videos/Music/Likes)** (`MediaApp.jsx`)
  - Cause: `BASE_TABS` used capitalized labels (`'Home'`, `'Music'`, …) and `setActiveCategory(tab)` stored them, but every content-render branch compared against lowercase (`activeCategory === 'music'`, etc.). Only the default view worked because the context initializes `activeCategory` to lowercase `'home'`. Clicking Music/Videos/Likes matched no branch → hero with no rows, so "music" appeared stuck among the Home videos.
  - Fix: tabs are now canonical lowercase keys with a `TAB_LABELS` map for display. Now Videos = videos only, Music = music only.
- **[FEAT] Likes tab shows liked videos AND music, separated** (`MediaApp.jsx`)
  - Previously only rendered liked music tracks. Now splits into "Liked Videos" (grid) and "Liked Music" rows via `likedVideos`/`likedTracks` memos filtered from all content by `likedIds`.

### 2026-07-07
- **[FIX] Music player bar not showing in media mode** (`MediaContext.jsx`)
  - Symptom: on `/media` the audio played but the `MusicPlayer` control bar never appeared, so music couldn't be controlled.
  - Cause: `MusicPlayer.jsx` render guard requires `hasEnteredMediaMode`, but that flag was only set by `confirmEnterMediaMode` (Sidebar warning-modal flow). Reaching `/media` via `MobileNav`'s `<Link to="/media">` or `VerticalVideo`'s `navigate('/media/:id')` bypassed it, leaving the flag `false`.
  - Fix: `playMedia` now calls `setHasEnteredMediaMode(true)` so the player bar renders whenever playback starts, regardless of entry path.
  - Note: `MiniPlayer.jsx` is dead code (never imported) and reads a non-existent `mediaMode` value — left as-is.

### 2026-04-12 (session 2)
- **[FIX] Long-video gate firing for logged-in users** (`VerticalVideo.jsx`)
  - Added `!user` guard to the 3-minute gate — logged-in users now watch full videos in the feed without interruption
  - Gate is intentionally kept for anonymous visitors only (conversion tool)
  - Also hid the "Full video" pill in the bottom bar for logged-in users

- **[FIX] "Keep watching here" immediately re-triggering** (`VerticalVideo.jsx`)
  - Old: `setLongVideoExpired(false)` alone — `elapsed` was still >= 180 so `handleTimeUpdate` re-triggered the gate on the next frame
  - New: resets `playbackStartRef.current` to current `video.currentTime` before dismissing, then resumes play — gives a fresh 3-minute window

### 2026-04-12 (session 1)
- **[PERF] Mux video load delay fix** (`VerticalVideo.jsx`, `VideoPost.jsx`)
  - Changed `preload="metadata"` → `preload={isVisible ? "auto" : "none"}` in feed cards
  - `VideoPost.jsx` grid cards set to `preload="none"`
  - Eliminated 2-3 minute startup delay caused by 50+ concurrent Mux connections

- **[FIX] Video gate firing too early** (`VerticalVideo.jsx`)
  - Added `videoRef.current.currentTime = 0` in scroll-away reset effect
  - Gates (subscriber preview at 60s, long-video at 3min) were firing seconds after returning to a video instead of the full threshold

- **[FIX] Non-visible video HLS seek waste** (`VerticalVideo.jsx`)
  - `handleLoadedMetadata` now returns early if video is not visible
  - Prevents non-visible HLS streams from fetching segments for random seek positions

---

## Environment / Deploy Notes

- Frontend deploys on **Vercel** (see `vercel.json`)
- `vite.config.js` has custom plugins in `/plugins`
- OG image generation at `/api/og/[id].js` (Vercel serverless function)
