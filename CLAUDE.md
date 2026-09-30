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
| `/` | `LandingPage.jsx` | Marketing landing (only page bundled eagerly) |
| `/browse` | `HomePage.jsx` | Main feed with stories + vertical video |
| `/chat/:channelId?` | `ChatPage.jsx` | Homies Chat (Discord-style) |
| `/explore` | `ExplorePage.jsx` | Explore/search feed |
| `/reels` | `ReelsPage.jsx` | Reels-only feed |
| `/watch/:postId` | `WatchPage.jsx` | Watch page — loads creator content or global feed |
| `/media/:id` | `MediaMode/MediaApp.jsx` | Full-screen media player |
| `/profile/:username` | `UserProfilePage.jsx` | User profile with video grid |
| `/studio` | `CreatorStudioPage.jsx` | Creator upload + management |
| `/wagers` | `WagersPage.jsx` | Betting/wager system |
| `/wallet/*` | `WalletIsolationMode.jsx` | Wallet mode (points balance, purchase, transactions). `pages/WalletPage.jsx` is NOT routed |
| `/live` | `LivePage.jsx` | Live streaming |

---

## Recent Changes Log

### 2026-09-30 (night) — Chat now-playing pill, new push toggles, admin push campaigns, "Send as push"
- **Now-playing pill** (`chat/NowPlayingPill.jsx`, logic in `lib/nowPlaying.js`) in the /chat header on sm+ (`variant="header"`), and as a slim row under the header on phones (`variant="bar"`, the phone header has no room): /chat renders outside the layouts that mount `<MusicPlayer/>`, so music kept playing with no controls. Shows only for a track actually loaded into the shared `<audio>` (`hasEnteredMediaMode` + audio `src`; the catalog's pre-selected first track doesn't count) and no video playing. ♪ Title · Artist (tap → `/song/:id`, which doesn't restart the current track), play/pause, ✕ hides it until a different track starts (sessionStorage `hh_chat_np_dismissed`).
- **Push toggles** `chatReplies`, `chatReactions`, `announcements`, `dailyRecap` (unset = on) in chat User Settings → Phone and Settings → Notifications → Push, via `PATCH /profile/me/notifications {channel:'push', key: bool}`. Backend must whitelist these keys (it echoes `pushNotifications`; unknown keys come back unset = on).
- **Admin push campaigns** (`pages/admin/PushCampaigns.jsx`, `lib/pushCampaigns.js`): `/admin/push` probes `GET /admin/push/campaigns`; when present it shows the campaign composer (title/body/link, category announcement|promo, audience all|members|free|inactive|active (days 1–365)|usernames; client limits mirror the server's `LIMITS` (title 65, body 240, url = app path or https, schedule ≤ 60 days), live count via `POST /admin/push/campaigns/preview`, send now or schedule, confirm dialog) + history table with Cancel for scheduled. A 404 without `code:'not_found'` (route missing) → the old Broadcast / Targeted forms exactly as before.
- **"Send as push"** in the chat message menu (chat staff who are also site admins): `SendAsPushDialog` prefilled from `GET /admin/push/from-chat/:id/draft`, audience + live count + confirm → `POST /admin/push/campaigns` with `category:'announcement'` and `sourceMessageId`.

### 2026-09-30 (later) — Adopt backend safety APIs (live chat auth, paid-only card donations, bans/blocks, marketing push opt-in)
- **`LiveChat.jsx`**: the socket URL carries only `streamId`; signed-in viewers send `{type:"auth", token}` on open, `auth_ok` gives the name the server shows (used for "You"), `auth_error` / guests → read-only with a "Log in to chat" button (`onLoginRequest`). Reconnects on sign-in/out; a replaced socket's late close can't touch state.
- **`GiftDialog.jsx`** card donations: amount picker ($1–$500) → `POST /live/:id/card-donation/checkout {amountCents, ttsMessage}` → redirect to Stripe; the TTS message is announced only after payment (webhook). Old pre-payment endpoint no longer called.
- **Comments**: `fetchComments({ order:'newest', before, withPagination })` (old page/limit call unchanged); `CommentsSheet` loads newest first + "Load older comments".
- **`lib/apiErrors.js`** (`apiErrorCode`, `isBannedError`, `isBlockedError`, `safeAppealUrl`). `api/homieshub.js`: 403 `banned` (and legacy `account_banned`) sets the banned screen once and keeps `appealUrl`; 403 `blocked` → one friendly toast (5 s throttle). `BannedScreen` links "Appeal the ban"; `/appeal` (`pages/AppealPage.jsx`) + `/support` stay reachable while banned.
- **Marketing & promotions push** is opt-in (`pushNotifications.marketing`, backend `utils/marketingPush.js`): toggle in Settings → Notifications and in chat User Settings (`PATCH /profile/me/notifications {channel:"push", marketing}`; turning it on also clears a `marketing.push:false` unsubscribe).
- Handoff: WalletLayout / PayPage already exchange `?code=` via `/auth/handoff-exchange` and strip it. MyConsent "Continue on web" still sends `?token=` to myconsent.me — that site (separate repo `myconsent-front`) only reads `token`, so switching needs it to exchange a code first.

### 2026-09-30 — Chat: drop files anywhere in the channel, paste screenshots, live link previews; tests + CI
- **`chat/DropZone.jsx`** wraps the message list + composer (ChatPage): dragging files from the desktop shows a full-channel "Drop to upload to #channel" overlay (enter/leave counted, no flicker; "You can't upload files here" where `can.attach`/`can.send` is off). Drops go to the composer through its ref (`Composer` is `forwardRef`, exposes `addFiles`). A file dropped outside the zone no longer makes the browser open it.
- **`chat/attachments.js`**: client checks that mirror the server (10 files, `me.uploadMaxBytes` / 20 MB, blocked html/svg/js/exe…, folders) with friendly toasts; the good files still attach. Clipboard screenshots are renamed `screenshot-<time>.png`. Composer tray: image + video thumbnails, size, per-file remove (`Remove <name>`), "Uploading N files… 42%" + progressbar; a failed upload puts the files back. Pasting text never gets hijacked by a clipboard file.
- **DMs (`/inbox`)**: drop or paste an image/video into the message bar (same `/files/upload` flow as the picker).
- **Link previews**: `useChat` `upsertMessage` keeps embeds from a `message.updated` when the send ack / late `message.created` (no embeds) lands after it; a newer edit can still drop them. `Embed.jsx`: gifs play as muted looping video with the still as poster (falls back to the still if the video url is unsafe — it used to render the still as a `<video>`), `video` embeds (YouTube from Discord) = big thumbnail + play badge linking out, third-party media `referrerPolicy="no-referrer"` and hidden if it fails to load. `MessageList`: a just-sent link shows `EmbedPlaceholder` for up to 5 s while the server unfurls. No CSP exists (vercel.json/index.html), so nothing blocks external thumbnails.
- **Tests**: vitest 0.34 (Vite 4) + Testing Library, `vitest.config.js` (separate from vite.config.js), `src/test/setup.js`; `npm test`. **Lint**: `.eslintrc.cjs` (react-app; pre-existing `import/first` / `no-restricted-globals` downgraded to warnings), `npm run lint` = 0 errors. **CI**: `.github/workflows/ci.yml` runs lint + test + build on PRs and pushes to main (Vercel's deploy is untouched).

### 2026-09-28 — Right-click menus in /chat; points rules copy
- `chat/ContextMenu.jsx` (shared shell, popover desktop / sheet phones). Right-click a name/avatar/@mention/member row → user menu (`openUserMenu`, host `UserMenuHost` in ChatPage): Profile, Message, Mention, Copy Username; staff: Copy User ID + the mod actions `GET /chat/members/:id/profile` `can` allows, which open UserCard on that view (`hh:chat-user-card` `detail.view`). Right-click a channel (ChannelSidebar): Mark As Read, Mute/Unmute (`actions.setChannelMuted`), Copy Link, staff Copy ID, slow mode if `can.manageChannel` (`actions.setSlowMode`); category: collapse/expand. ChatPage root swallows the browser page menu except on inputs, links, images/video and selected text. Phones: long-press stays the message sheet (Android contextmenu on names is ignored).
- PerksSheet Points tab lists the new earning rules + "earned points cover one free month every 3 months".

### 2026-09-27 — Chat: right-click/press-and-hold message menu, full emoji picker, phone layout fixes
- **Message menu** (`chat/MessageList.jsx` `MessageMenu`): right-click a message (desktop, popover at the pointer) or press-and-hold (phones, bottom sheet; 450 ms, vibrates) → recent quick reactions + Add Reaction / Reply / Edit / Pin / View Reactions / Copy Text / Discoverability / Moderate (timeouts, kick, ban) / Report / Delete. The ⋯ button opens the same menu. Hover bar (desktop only, `CAN_HOVER`) is now Add Reaction / Reply / Edit / More — no quick emojis (owner preference). Right-clicking a link or selected text keeps the browser menu on desktop. Row handlers ignore events bubbling from the portaled popups (`onRow`).
- **Full emoji picker** (`chat/EmojiPicker.jsx`, emoji-mart 5 + `@emoji-mart/react`, native set, data lazy-loaded ~430 KB on first open): every standard emoji, search, skin tones, frequently used. Used for reactions (menu, hover bar, "+" chip after reactions) and a new composer emoji button (inserts at the caret; on phones drops the keyboard). Recent reactions in localStorage `hh_chat_recent_reactions`. Theme via `em-emoji-picker` CSS vars in `index.css`.
- **Phones:** the global `@media (max-width:768px)` 44px/flex tap-target rule in `index.css` is scoped with `:where(body:not(.hh-chat-open))` (same specificity elsewhere); `ChatPage` sets `body.hh-chat-open` while signed in. It had inflated inline links, reaction chips and icon rows in the chat. Small chat icon buttons got explicit padding instead. Chat root is pinned to `visualViewport` (top/height) so the on-screen keyboard can't push it around; `body.hh-chat-open` is `overflow:hidden`. User Settings has a phone title bar with an always-visible close.
- **`chat/Avatar.jsx`**: shared avatar with fallback to the initial when the picture fails to load (MessageList, MemberDirectory rows, sidebar footer, UserCard). Backend now keeps Discord-linked avatars synced (homieshub-backend `utils/chat/discordAvatars.js`).
- Tested against the local staging server with puppeteer: 390×844 and 360×740 touch, 820 tablet, 1366 desktop (menu, long-press sheet, picker react + search, composer insert, user card tap, settings, no horizontal overflow).

### 2026-09-26 (late) — Owner-only "Owner details" (IPs + locations) and stream-safe admin screens
- **`components/OwnerPrivateInfo.jsx`**: collapsed "Owner details" section, only for `user.isOwner` (thehomies / mwosa / mwosa_1). Fetches NOTHING until clicked (`GET /admin/users/:id/private`); then shows a "don't open on stream" warning, IPs (city/ISP, first/last seen, VPN flag, signup IP) and every verified location (place, road, time, source, accuracy, map link). Re-collapses when the person changes (`key` + stale-response guard). Used in the chat member card (not for Discord-only placeholders) and on other people's profile pages.
- **`components/admin/Sensitive.jsx`**: `<Sensitive>` shows •••.•••.••• instead of an IP / IP-based location until `<RevealToggle/>` ("Show IPs") is on. Off on every page load, never remembered, auto-hides after 5 minutes. Applied to MediaAnalytics (Listeners, visitor profiles; also /media/admin), AdminVisitors, AdminUsers (IP history, profile Location/ISP/Primary IP), AdminMusicManager listeners. Other admins get IPs masked by the backend anyway.
- **`LocationGate`** always takes a fresh reading for the account's verification (it used to reuse a cached one, possibly old or from someone else on the same browser).

### 2026-09-26 (night) — Member card posts & likes, chat User Settings, desktop notifications
- **Member card (`chat/UserCard.jsx`):** Posts N / Liked N buttons open in-card lists (posts, videos, reels; thumbnails, dates). Posts: `/post/:id`; videos/reels go to `/watch/:id` with `state.username` = the creator (WatchPage needs it to load the right videos). Liked is only offered to the person themselves or site admins (backend 403s everyone else). Profile / Open full profile hidden for Discord-only placeholders.
- **Gear by your name → `chat/ChatSettings.jsx` (User Settings modal, full-screen on phones):** My Profile (avatar upload `/files/upload?folder=avatars`, display name, @username, about me, via `PATCH /profile/me`); Notifications (desktop notifications for this browser + mentions/DMs sub-toggles + test button, mute whole server, phone push mentions/DMs/live, email DMs/mentions, "Homies updates & offers" email/Discord/in-app/push opt-outs); Privacy & Data (discoverable posts, delete my messages; replaces the old gear dropdown). Toggles save immediately and update from the server's response; closing with unsaved profile edits asks first.
- **Desktop notifications (`lib/desktopNotify.js` + `useChat`):** the browser Notification API, prefs in localStorage `hh_desktop_notifs`. Fires for messages that ping you (direct @, @everyone/@here, your roles; respects server/channel mute except direct @; skips blocked users and messages >2 min old) and DMs (skips muted threads and opted-out promo DMs), only while the tab isn't focused. Click → jumps to the message (`hh:chat-navigate`) or the DM. Works while a /chat tab is open (even minimized); a closed tab/browser would need Web Push (service worker + VAPID), not built. Browsers that grant permission but can't show page notifications (Android Chrome) show as unsupported.
- **`AuthContext.refreshMe`:** only a 401/403/404 signs you out now. Any error used to (a network blip mid-action logged people out).

### 2026-09-26 (evening) — /chat member search, member cards with mod actions, live mention highlighting
- **Header 🔍 (`chat/MemberSearch.jsx`, Ctrl/⌘+K):** expands into a search bar; phones take over the header. Staff get `StaffDirectory` (every account incl. Discord-only, exact totals: members / in the app / Discord only, filters All / Discord / No Discord); everyone else `MemberResults`. Matches display name, @username and Discord name.
- **`chat/MemberDirectory.jsx`:** shared `MemberRow` (every row opens the member card), `Handles` (@username · Discord name, Discord-only / banned badges). `MemberList` rows are clickable now; its old staff search box moved to the header.
- **`chat/UserCard.jsx` rebuilt (Discord profile popout):** role-colour banner, avatar/status, @username + Discord name, bio, roles, member since; staff also see last seen, message count, timeout/ban badges. Message / Profile / Mention (drops @username into the composer via `hh:chat-mention`) / Copy. **Moderation** (only what `GET /chat/members/:id/profile` `can` allows): Roles (toggle list), Time out (60s–1 week) / Remove timeout, Delete recent messages (10/50/100), Kick, Ban (delete history: none / 1h / 24h / 7d), Unban; each with optional reason and a result line saying whether Discord applied it too. Phones: bottom sheet; desktop: fits the viewport and scrolls. Actions are tied to the card they started on (switching cards mid-action can't mix them up).
- **Composer mentions:** the picker shows avatars + Discord names and offers **@everyone / @here** to people allowed to use them. Mentions that will really ping are highlighted while typing and flash once (`chat-mention-pop`, gold `chat-everyone-pop` for @everyone): picked names, typed names that match a real member (resolved from loaded members, else one debounced lookup), and @everyone/@here only with permission; unknown names stay plain. Restored drafts re-resolve. Send converts whole-word tokens (a trailing "." is punctuation). The textarea scrollbar is hidden so the highlight mirror wraps identically.
- Tested with Playwright against the local staging server (29 checks: admin/regular/phone).

### 2026-09-26 (evening) — Song URLs, tips, feed swipe, landing trim
- **Readable song URLs** `/music/<artist>/<song>` (route in App.jsx → `SongPage`); `/song/:id` + `/track/:id` swap the address bar to it (`musicApi.getPath`/`getBySlug`). vercel.json proxies `/music/:a/:s` + `/song/:id` to backend `og.js` (server-injected SEO tags; old ids 301). robots.txt allows /post/, /song/, /track/ and lists the sitemap.
- **Tips** (`components/TipModal.jsx`, `lib/tipWallets.js`): Card tab → `POST /tips/checkout` → Stripe Checkout (anyone, no account); Crypto tab → QR + open-in-wallet (USDC/ALGO on Algorand = Mwosa wallet; BTC + ETH added). `?tip=thanks` → toast on SongPage.
- **Feed swipe fix** (`VerticalVideoFeed.jsx`): observer attaches after the feed container mounts (it waits on the playback check), visible = ≥60% on screen, callbacks in refs (no rebuild mid-swipe). `VerticalVideo`: muted-autoplay fallback when iOS blocks unmuted play after a swipe.
- **Music**: a tap always starts playback even while "loading" (iOS never loads gesture-less audio); play buttons no longer disabled while loading.
- **Landing**: Wagers card hidden, Chat card ("Our own native Discord") + Live moved; hero = Join Chat / Browse Content / View Memberships (consultation button removed).

### 2026-09-26 (later) — MobileNav alignment
- Every bottom-nav tab uses the same `h-7` icon slot + `gap-1` + `leading-none` label, so the Chat pill no longer sits higher than Browse/Media/Menu. The + button is `w-11 h-11` inside the bar (no more `-mt-6` float / `border-4`).

### 2026-09-26 — Homies Chat is the community's front door (/join, chat buttons, app nav inside /chat)
- **`/join`** ("Join The Homies"): Continue with Discord (`/auth/discord?gate=1`) or Google (`/auth/google?gate=1`); "No Discord needed. It's all in the app." badge; done step = animated Homies Chat preview (`ChatPreview`, framer-motion, `MotionConfig reducedMotion="user"`) → "Check out Homies Chat". Discord is optional after: "Join our Discord too" → `POST /auth/discord/connect?gate=1` (or a Discord gate sign-in if Discord is already linked), back to `/join?discord=connected` (or the timestamped `hh_join_link_discord` sessionStorage flag) → `admit({discordOnly:true})` adds them to the server. Backend returns `discord:false` on chat-only admits; `/gate/status` has `inDiscord`.
- **Chat buttons everywhere**: Header "Chat" pill (md+) + "Homies Chat" in the account menu; Sidebar first item (highlighted); MobileNav Chat slot (replaced Home — logo goes home); MembershipWall, JoinInviteModal, LandingPage (hero + links + footer), VerticalVideo paywall. Logged-out → `/join`, signed-in → `/chat`.
- **Inside /chat** (`components/ChatAppRail.jsx`): the app's nav as round icons in the server rail under the server icon; toggle widens the rail to 220px with names (xl+ only, `hh_chat_rail_open`); phone drawer uses `compact` (icons only). On md+ the app `Header` sits above the chat (`ChatPage` root `md:top-14`).
- Note: a global `@media (max-width:768px) button, a {display:flex; justify-content:center}` in `index.css` overrides Tailwind layout on phones — add `block`/explicit classes on card-like buttons.

### 2026-09-26 — Content restored: previews for signed-out/free, music in the feed, chat → DMs
- **Access is server-decided** (homieshub-backend `utils/mediaAccess.js`): each video carries `access` (`full` / `sample` 60s / `teaser` 8s) + `previewSeconds`, and non-full viewers get a preview clip's playback ID. The old client paywall (`isPaywalled`) is gone; the 60s/3-min client gates only apply to items without `access`. The "Video Gate System" section above is legacy.
- **`VerticalVideo.jsx`**: preview pill while a clip plays; when it ends → signed out: "Sign up free" / "I already have an account" (returns to `/watch/<id>`); free account: membership modal. No random start / no loop for clips.
- **`SignupPrompt.jsx`** (mounted in App): one bottom sheet for every preview end — `openSignupPrompt({kind, title, cover, redirect})`. **`handleLoginRequest({tab, redirect})`** stores `post_auth_redirect` so people land back where they were.
- **Music in the feed**: `ContentContext` loads `/music/feed` and drops a song in after every 6 videos; `VerticalVideoFeed` renders `music/MusicFeedCard.jsx` (autoplays on screen, cover + `music/WaveViz.jsx` = the Media Mode visualizer wave, like/comments(`targetType "music"`)/share, tap → full player at the same position via `playMedia(track, {startAt})` + `/song/:id`). Signed out = 30s preview → sign-up sheet.
- **Media Mode**: items with `access !== 'full'` play the clip in `VideoPlayer` (Preview badge) then open `VideoPurchaseGate`; full-access items still need membership/purchase client-side (Media Mode = members). Signed-out music previews end in the sign-up sheet; if they signed in meanwhile, the full song continues from 0:30. Feeds/rows refetch on sign-in/out.
- **Browsing is public**: `MembershipWall` BROWSE_PREFIXES (/browse, /watch, /post, /media, /song, /track, /profile, /explore, /reels) skip the sign-in wall; `LocationGate` no longer gates signed-out visitors (accounts still verify once).
- **Posting open to free accounts** (threads/polls/trips/events); PostModal keeps Upload Moment / Go Live / Mint for members.
- **Chat → DMs**: click a name/avatar in `MessageList` → `chat/UserCard.jsx` → Message = the same `/inbox?user=` thread (Discord-only people get a bot DM linking back). Member-list rows aren't wired yet (`openChatUserCard(member, e)`).

### 2026-09-24 — Code-split routes, dist untracked, chat member-list refresh, leaderboard, chat fixes
- **[PERF] Route code-splitting** (`src/App.jsx`): every routed page except `LandingPage` (plus `StoryViewer`) is now `lazyWithReload(() => import(...))`. Suspense boundaries sit INSIDE `MainLayout` / `MediaLayout` / `WalletLayout` / `AdminRouteWrapper` (so header/sidebar/admin chrome stay up while a page chunk loads), plus one outer boundary around `<Routes>` for the standalone routes and one inside `LocationGate` for `/chat`. Fallback = small `RouteFallback` spinner (dark `#313338` for /chat). Main entry chunk: **4,379.77 kB → 3,504.60 kB** (gzip 1,228 → 1,012 kB). ChatPage is its own ~147 kB chunk.
  - **Why it's not smaller:** the rest of the entry is providers loaded in `main.jsx` for every page (algosdk + `@txnlab/use-wallet` + bn.js/elliptic via `WalletContext`/`WagerContext`, framer-motion in Header/Sidebar/MobileNav) — and hls.js/@mux (~1 MB) which Rollup keeps in the entry even though only lazy chunks import `@mux/mux-player-react` (verified with a module-graph dump; a `manualChunks` split still leaves a static `import"./mux-*.js"` in the entry, so it was NOT shipped). Next wins: lazy-load the Algorand wallet stack in `WalletContext`, then revisit the Mux placement.
  - **New `src/lib/lazyWithReload.js`**: if a chunk import fails (a tab opened before a deploy asks for old hashed chunks, which no longer exist), reload the page once (30 s sessionStorage guard against loops).
- **[BUILD] `dist/` is no longer tracked** (`git rm -r --cached dist`, added to `.gitignore`). Verified Vercel builds from source (`npm run build` → `vite build` in the build log; live asset hashes never matched the committed dist).
- **[FIX] Member list stale after a gift** (`hooks/useChat.js`): `loadMembers()` is re-run (debounced 1 s) on `membership.updated`, `roles.updated`, a live `message.created` with `special.kind` `gift`/`redeem`, and after your own `actions.gift()`.
- **[FEAT] Leaderboard** (`components/chat/perks/Leaderboard.jsx`, trophy button in the chat header next to the points pill): `GET /api/chat/leaderboard?period=week|month|all` → Top gifters (points + gift count) / Most active (points earned), Week/Month/All tabs, 🥇🥈🥉 for 1–3, role colours, your row highlighted. Bottom sheet on phones, centred panel on desktop. `actions.leaderboard()` resolves `null` on 404 / unexpected shape → the trophy is hidden (probed once when the chat opens).
- **[FIX] `clearError` never cleared** (`useChat.js`): it dispatched `status` with `error: null`, which the reducer treats as "keep the old error" (`??`). New `clearError` action — a repeated identical error (e.g. two timeouts) now toasts again.
- **[FIX] Composer**: attachment thumbnails created a new blob URL (and reloaded the image) on every keystroke and never revoked them → `FileThumb` with create/revoke in an effect. A slow @-mention search could reopen the picker after you'd kept typing or sent → only the latest request applies.
- **[FIX] PointsPill**: if the balance changed mid count-up, the next animation jumped back to the stale start value.
- Tested with Playwright against the built app with all `/api/chat/*`, `/auth/me`, `/wallet/*` and `/ws/chat` stubbed (390×844 touch + 1280×800): lazy routes (/chat, /wallet, /wallet/transactions, /media, /browse, /settings, /terms, /admin/login, /memberships) load with no page errors, member list regroups after `membership.updated`, leaderboard tabs/empty state/404-hidden, /points /shoutout /redeem /gift, image viewer open/close, no horizontal overflow at 390 px.

### 2026-09-22 (round 3) — Location gate now covers logged-in users too + hard membership paywall
- **[FEAT] `LocationGate.jsx` now gates logged-in users, not just anonymous visitors** (tightened same day, in response to suspected info-gathering by non-paying accounts). Anonymous check unchanged (browser `hh_geo` cache); logged-in check is now the account's own `user.gate.locationEnabledAt` — an existing member who never went through the /join location step is gated exactly like anyone else until they verify once. Verifying calls the same `POST /gate/location` the /join flow uses, then `refreshMe()`. Recomputes on login/logout via a `useEffect` so a mid-session login doesn't leave a stale gate state.
- **[FEAT] `VerticalVideo.jsx`: hard membership paywall, no free preview.** New `isPaywalled = !isMember` folded directly into the existing `isBlurred` flag (which already gated autoplay/preload/the play-toggle handler, so this reuses all that wiring instead of adding a parallel gate). A non-member's feed is blurred from frame one — the old 60s-then-block preview gate for `isSubscriberOnly` posts is now effectively subsumed (dead but harmless) since blur now applies to ALL posts immediately regardless of that flag. New overlay: "A paid membership is required to view content" + **Get a Membership** / **Join the Discord** buttons (reuses the existing `showUpgradeModal` state/modal).
- **[SECURITY FIX]** `public/robots.txt` (new) disallows `/media`, `/song/`, `/track/`, `/post/`, `/watch/`, `/browse`, `/profile/`, `/explore` — "nothing from media mode should be indexed." Companion backend fix in `homieshub-backend`: `fetchPostById`/`routes/og.js` never checked `visibility` at all, so a "private" video was still fully reachable via its direct link and link-preview card — see that repo's CLAUDE.md.
- **[CONTENT]** All 25 of the `thehomies` admin/creator account's own uploaded videos were set to `visibility: private` via the live admin API (one-off action, not a code change) — hidden from every feed and now also unreachable via direct link after the fix above. Other creators' content (trips, posts, etc.) is unaffected — this was scoped to that one account only, not a platform-wide takedown.

### 2026-09-22 (round 2) — Unified the two geo systems + site-wide gate + soft join nudge
Consolidated onto ONE capture pipeline instead of two competing ones — see round 1 below and the pre-existing passive `geo_update` system (`lib/tracker.js` `captureGeo`, added 2026-09-20) it now shares with.
- **`lib/tracker.js`**: `captureGeo()` is now exported, returns `Promise<boolean>`, and takes `{force}` to bypass the 7-day deny-backoff for an explicit user-initiated retry. New `isLocationVerified()` (`= !!getCachedGeo()`) is the single "has this browser verified?" check used everywhere. `initTracker()` no longer silently prompts a brand-new visitor on page load — it only auto (re-)checks `if (isLocationVerified())`, i.e. a browser that already granted once. **First-ever capture for a never-verified visitor now only happens through explicit gate UI** (LocationGate / JoinGatePage), never silently.
- **[FEAT] Site-wide gate, not just `/browse`.** New `components/LocationGate.jsx` wraps `MainLayout`'s `<Outlet/>` in `App.jsx` for every route except `LOCATION_GATE_EXEMPT_PATHS` (`/`, `/terms`, `/privacy`, `/community-guidelines`, `/child-safety`, `/support`) — logged-out + unverified visitors can't reach real app content anywhere else without verifying (gets geo + IP at minimum). Renders a blurred placeholder + `LocationGateOverlay` in place of children — never mounts the real page underneath, so nothing loads until verified. Logged-in users are never gated. Once verified (this browser has `hh_geo`), never shown again — `initTracker()`'s silent per-session re-check takes over, matching "don't require it again, just track activity."
- **`components/LocationGateOverlay.jsx`** rewritten to call the shared `captureGeo({force:true})` instead of its own separate `navigator.geolocation` call — no more competing prompts/cache keys.
- **`pages/JoinGatePage.jsx`**'s `enableLocation()` also now goes through the shared pipeline: if this browser already has `getCachedGeo()` cached (e.g. verified while browsing logged-out pre-signup), it reuses those coords and posts straight to `/gate/location` with no new prompt; a `useEffect` auto-runs this the instant `step==='location'` if already verified, so an already-verified user never even sees the button.
- **[FEAT] Soft join-invite nudge** — new `components/JoinInviteModal.jsx`, dismissible, routes to `/join` on "Join now". Triggered from `App.jsx`: for logged-out visitors, 45s after mount, only if `isLocationVerified()` (never stacks on `LocationGate`) and not shown in the last 24h (`hh_join_invite_last_shown`). Never shown on `/join` itself.
- **[REVERTED]** round 1's `HomePage.jsx`-local gate (`hasHomeLocation`/`hh_home_location`) — superseded by the App-level `LocationGate`, which covers `/browse` plus every other route.

### 2026-09-22 (round 1) — Join-gate location step (superseded above)
- `/join` gained a 4th hard-gate step (connect → email → **location** → admitted) requiring `POST /api/gate/location` (`homieshub-backend`) before admit. Still accurate — see round 2 for how it now shares tracker.js's capture pipeline instead of calling `navigator.geolocation` directly. Existing already-admitted users are unaffected (short-circuit to `done`).

### 2026-08-23 — Admin panel for the announcement banner
- **`src/pages/admin/AdminBanners.jsx`** (new), wired at `/admin/banners` (`src/App.jsx`) + sidebar entry (`src/pages/admin/AdminLayout.jsx`): create/pause/delete the in-app top-of-feed banner against `homieshub-backend`'s `/api/admin/banners` CRUD — style, audience (all/free/paid), optional CTA + auto-expire. Only one banner is ever live; creating a new one pauses the current one.

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
