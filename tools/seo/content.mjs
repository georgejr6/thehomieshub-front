// Static SEO content for the public pages of thehomies.app.
// Every claim here maps to something that exists in the app (see SEO_REPORT.md).
// Prices are injected at build time from the live shop API (see prerender.mjs).

export const SITE = 'https://www.thehomies.app';
export const YOUTUBE = 'https://www.youtube.com/@TheHomiesHub_';
export const UPDATED = '2026-10-21';

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/live-boxing-stream-community', label: 'Live & Boxing' },
  { href: '/streetwear-merch', label: 'Merch Guide' },
  { href: '/community-chat-and-membership', label: 'Community' },
  { href: '/about', label: 'About' },
];

// Each landing page: path, title (<=60), description (<=155), h1, intro, sections [{h2, html}], faq [{q,a}]
export const LANDING = [
  {
    path: '/live-boxing-stream-community',
    title: 'Live Boxing Stream Community | The Homies',
    description: 'Watch fight nights and live streams with the crew, talk in real-time chat, and back Mwosa in his corner. Join The Homies live boxing community free.',
    h1: 'The live boxing stream community',
    lead: 'The Homies is a community that watches fights, trains and talks about the sweet science together. Streams go out live, the chat runs next to them, and the people in it know each other by name.',
    sections: [
      {
        h2: 'What watching with The Homies looks like',
        html: `<p>Most boxing streams are a video and a silent comment box. The Homies is built the other way around. When a live stream is on, you open the app, hit <a href="/live">Live</a> and the chat is right there with the picture. People call rounds as they happen, argue about a judge's card, and react to the knockdown at the same second you do. If you have ever watched a big fight alone on your couch and wished a room full of people who care were next to you, that is the use case.</p>
<p>The streams run on our <a href="${YOUTUBE}" rel="noopener">YouTube channel</a> and inside the app. Fight-night streams are announced ahead of time on the channel and in the community chat, so you do not have to refresh a page and hope. Commentary streams, where the host talks over a fight, a clip or a news story, run the same way: live, with chat, and with the best moments clipped afterwards so you can catch up.</p>`,
      },
      {
        h2: 'Why the community matters more than the stream',
        html: `<p>A single stream is a one-night thing. A community is what makes you come back for the next one. The Homies chat is a native, Discord-style space inside the app, with channels, direct messages and roles, so the conversation does not end when the stream does. You can break down film from the last card, ask where to start if you want to learn to box, trade gym stories, or just keep up with what the crew is watching this week.</p>
<p>It is also a place where fight fans and people who train meet. Mwosa, who runs The Homies, trains and fights, and the community follows that journey openly: the work that goes into camp, the nerves before a bout, and the result afterwards. That makes the streams feel less like content and more like following a friend you are rooting for.</p>`,
      },
      {
        h2: 'Back Mwosa in his corner',
        html: `<p>When there is a fight on the calendar, the <a href="/sponsor">Get in Mwosa's corner</a> page lets supporters chip in toward the fight purse. Supporters get Homies access at a discount, bigger tiers put your name on fight night, and every goal the purse hits unlocks something for everyone. It is optional. You can watch, chat and clip for free without ever paying anything.</p>
<p>If you would rather support the platform directly, there is a <a href="/donate">donation page</a> that takes card, Apple Pay, Google Pay, Cash App and crypto. You can also wear it: the <a href="/streetwear-merch">streetwear merch</a> is the crew's own line, printed to order.</p>`,
      },
      {
        h2: 'How to join in three steps',
        html: `<ol>
<li><strong>Open the app.</strong> The Homies runs in your browser at thehomies.app, no download needed. </li>
<li><strong>Join the chat.</strong> Tap <a href="/join">Join</a> and sign in with Discord or Google. You land in Homies Chat and can start talking right away.</li>
<li><strong>Catch the next stream.</strong> Go to <a href="/live">Live</a> when a stream is on, or subscribe on <a href="${YOUTUBE}" rel="noopener">YouTube</a> so the next fight night shows up in your feed.</li>
</ol>
<p>Free accounts get shorts, music and the community. Paid <a href="/community-chat-and-membership">memberships</a> unlock members-only video, the full media library and more.</p>`,
      },
      {
        h2: 'Clips, shorts and replays',
        html: `<p>You will not miss the moment because you were at work. The best parts of every stream are clipped into shorts and longer videos, and they live in the app's vertical feed as well as on YouTube. The For You feed in <a href="/browse">Browse</a> is built like a short-video app: swipe, like, comment and share. If a clip gets you hooked, the link back to the full stream is one tap away.</p>
<p>Creators in the community can post their own clips and videos too, so the feed is not only the host. If you cut a good highlight, you can upload it and let the crew react.</p>`,
      },
    ],
    faq: [
      { q: 'Is it free to watch the streams?', a: 'Yes. Streams on our YouTube channel are free to watch, and a free account lets you use the community chat, shorts and music in the app. Paid memberships add members-only content.' },
      { q: 'What is the fight purse?', a: "It is an optional way to chip in toward Mwosa's next fight. Supporters get discounted membership access, and purse goals unlock extras for everyone. Watching and chatting stay free." },
      { q: 'How do I find out when the next fight-night stream is?', a: 'Subscribe to the YouTube channel and join Homies Chat. Upcoming streams are announced in both places before they start.' },
      { q: 'Can I watch on my phone?', a: 'Yes. The app works in a mobile browser, so you can watch and chat from anywhere.' },
    ],
    related: ['/about', '/community-chat-and-membership', '/streetwear-merch'],
  },
  {
    path: '/streetwear-merch',
    title: 'Streetwear Merch The Homies | Tees, Hoodies, Hats',
    description: 'Streetwear from The Homies: tees from {{teeFrom}}, hoodies from {{hoodieFrom}} and embroidered dad hats from {{hatFrom}}. Printed to order, or design your own.',
    h1: 'Streetwear merch from The Homies',
    lead: 'Phrases straight from the streams, on tees, hoodies and embroidered dad hats. Every piece is printed to order, and you can customize one or design your own in the shop studio.',
    sections: [
      {
        h2: 'Where the designs come from',
        html: `<p>The Homies merch does not start in a design meeting. It starts on a stream. A line gets said, the chat repeats it, and a week later it is on a shirt. "Say Less," "No Cap," "Deadass," "Pull Up," "Lock In," "Big Homie" and "We Outside" are all things the crew actually says, which is why the line feels like an inside joke you are in on rather than a logo slapped on a blank.</p>
<p>There are also themed drops that follow the conversation on the channel, including the nomad and travel runs for people who have packed up and moved abroad, and the LXVEMORE line, with a stitched teddy motif on beanies, hats, hoodies and crewnecks. Browse everything in the <a href="/shop">full shop</a>.</p>`,
      },
      {
        h2: 'What is in the shop, and what it costs',
        html: `{{priceTable}}
<p>Prices above are the lowest price for each product type at the time this page was built. The exact price for a product depends on the size and color you pick, and it is always shown on the product page before you check out. Larger sizes on some tees cost a couple of dollars more.</p>`,
      },
      {
        h2: 'Printed to order, not sitting in a warehouse',
        html: `<p>Nothing in the shop is pre-printed in bulk. When you order, your piece is printed and shipped to you. That keeps the catalog large without the crew carrying inventory, and it is what makes customization possible. It also means production takes a few days before shipping, so plan ahead if you want something for an event. Shipping options and the final total are shown at checkout, and your order history lives under <a href="/shop/orders">Orders</a>.</p>
<p>Tees and hoodies come in the standard size run, and the dad hats are embroidered rather than printed, which holds up better on a curved brim and looks more like something you would buy from a real clothing brand. Colors vary by product, and each product page shows every colorway with its own photo.</p>`,
      },
      {
        h2: 'Customize it or design your own',
        html: `<p>On any product you can open the studio and change it: swap the color, move the text, add your own words. If you would rather start from nothing, <a href="/shop/design">design your own</a> from a blank garment. Your saved designs are kept in your <a href="/shop/library">library</a> so you can come back and reorder. It works well for crew shirts, gifts and the kind of one-off piece nobody else will be wearing.</p>
<p>Points you earn in the community can also take money off an order. In the cart you can apply Homies Points, where one point is worth one cent, up to a share of the item total that the cart shows you.</p>`,
      },
      {
        h2: 'How to pick a size and style',
        html: `<p>Hoodies run roomy, which is the point of a hoodie, so if you are between sizes and want a fitted look size down; if you want a boxy streetwear drape, stay true to size. For tees, check the size chart on the product page, since the blank varies slightly by color. Dad hats are adjustable, so there is no sizing to guess. If a piece is sold out it is marked on the product page and will not take an order.</p>
<p>Not sure where to start? The tees are the best entry point: the lowest price in the shop, a wide range of phrases, and an easy way to find out whether you like the print quality before you move up to a hoodie.</p>`,
      },
      {
        h2: 'Wear it to the next stream',
        html: `<p>The point of merch is that it connects to something. If you watch the fights with us, wearing the shirt to the next <a href="/live-boxing-stream-community">fight night</a> is half the fun, and you will see the same lines in the chat. New to The Homies? Read <a href="/about">what we are about</a> or <a href="/join">join the chat</a> first. Then pick the line that sounds most like you.</p>`,
      },
    ],
    faq: [
      { q: 'How long does an order take?', a: 'Items are printed to order and then shipped, so allow production time before shipping. Estimated delivery is shown at checkout.' },
      { q: 'Can I customize a shirt?', a: 'Yes. Open the shop studio from any product, or design your own from a blank garment. Saved designs live in your library.' },
      { q: 'Are the hats embroidered?', a: 'Yes, the dad hats are embroidered and adjustable.' },
      { q: 'Can I use points to pay for merch?', a: 'Homies Points can be applied in the cart. One point is worth one cent, up to the limit the cart displays.' },
    ],
    related: ['/shop', '/live-boxing-stream-community', '/about'],
  },
  {
    path: '/community-chat-and-membership',
    title: 'Homies Chat & Membership | The Homies Community',
    description: 'Join The Homies community chat free, or go premium from $10/month for members-only video, media library and more. See every tier and what it includes.',
    h1: 'Homies Chat and membership',
    lead: 'The Homies is a free community with a paid layer for people who want more. Here is exactly what each level includes, what it costs, and how to get in.',
    sections: [
      {
        h2: 'Start free: Homies Chat',
        html: `<p>The community lives in <strong>Homies Chat</strong>, a native chat space built into the app. It works like Discord, with channels, direct messages and roles, but it sits next to the video feed, the live streams and the shop, so you never switch apps. To get in, tap <a href="/join">Join</a> and sign in with Discord or Google. You can be talking in under a minute.</p>
<p>A free account also gets you shorts and music. Short clips from the streams play in a vertical feed in <a href="/browse">Browse</a>, and the music library has releases from Mwosa and other artists on the platform.</p>`,
      },
      {
        h2: 'The three membership tiers',
        html: `<p>Paid memberships are for people who want the full thing. Here is what each includes, taken straight from the membership page:</p>
<h3>Discord tier: $10 a month, or $96 a year</h3>
<ul><li>Full Discord server access (this tier is Discord only)</li><li>All community channels and roles</li><li>Verified Homie role on Discord</li></ul>
<h3>The Homie: $15 a month, or $100 a year</h3>
<ul><li>Everything in the Discord tier</li><li>Full access to members-only video content</li><li>Patreon and behind-the-scenes content</li><li>Daily market updates</li><li>Unlimited Directory access</li><li>Media Mode, the full streaming library</li></ul>
<h3>Digital Nomad: $100 a month, or $840 a year</h3>
<ul><li>Everything in The Homie tier</li><li>All exclusive Nomad channels and content</li><li>Remote jobs and freelance contract access</li><li>The full Digital Nomad course</li><li>Website or e-commerce setup after three months</li><li>One-on-one virtual mentorship sessions</li><li>Daily direct mentorship</li></ul>
<p>Yearly billing works out cheaper than monthly on every tier. If you start on the $10 plan and want to move up to The Homie at $15, the plan is swapped on the same subscription so you are not charged twice. Check live pricing and sign up on the <a href="/memberships">memberships page</a>.</p>`,
      },
      {
        h2: 'Who each tier is for',
        html: `<p>Pick the Discord tier if all you want is the community server and the verified role. Pick The Homie if you want the content: the members-only videos, the behind-the-scenes material and the full media library. It is the tier most people who just like the videos and the music will want. Pick Digital Nomad if you are seriously working on leaving a traditional job and building location-independent income. It adds the course, the job and contract access, the setup help and the mentorship on top of everything else, and it is priced like a coaching program rather than a content subscription.</p>
<p>None of the tiers is required to enjoy The Homies. The streams are free on YouTube, and a free account covers chat, shorts and music. Membership is a way to support the platform and get the extras.</p>`,
      },
      {
        h2: 'How payment and access work',
        html: `<p>After you pay, your account is upgraded within minutes and the members-only feed unlocks on its own. Cash App is accepted on every tier, including monthly, three-month, six-month and yearly options; start the subscription flow in the app to get the payment instructions. If you paid with a different email than your account email, use <a href="/billing">Connect your membership</a> after signing in and the payment is matched to your account.</p>
<p>If you cancel, access continues until the end of the billing period you already paid for. Subscriptions are not refundable unless explicitly authorized. Memberships are subject to the <a href="/terms">Terms of Service</a>, and access may be limited based on verification or community standards.</p>`,
      },
      {
        h2: 'Not ready to pay? Other ways in',
        html: `<p>Watch the <a href="/live-boxing-stream-community">live streams</a> for free, browse the <a href="/shop">shop</a>, or support the platform with a one-off <a href="/donate">donation</a>. When you want more, memberships are here. For anything else, our <a href="/support">support page</a> is the fastest route to a person.</p>`,
      },
    ],
    faq: [
      { q: 'How do I access member content after subscribing?', a: 'Your account is upgraded within minutes of payment confirmation. Log in and the exclusive feed unlocks automatically.' },
      { q: 'Can I pay with Cash App?', a: 'Yes. Cash App is accepted for all tiers, including monthly, 3-month, 6-month and yearly options. Start the subscription flow inside the app to get payment instructions.' },
      { q: 'What happens if I cancel?', a: 'Access continues until the end of your current billing period. Subscriptions are non-refundable unless explicitly authorized.' },
      { q: 'Can I upgrade from The Homie to Digital Nomad later?', a: 'Yes. Reach out through the community or message an admin to switch plans at any time.' },
    ],
    related: ['/about', '/live-boxing-stream-community', '/streetwear-merch'],
  },
  {
    path: '/about',
    title: 'About The Homies | Streams, Clips, Merch, Community',
    description: 'The Homies is a community app for live streams, clips, music, merch and chat, run by Mwosa. See what is inside and how to join for free.',
    h1: 'About The Homies',
    lead: 'The Homies is a community app that brings live streams, short clips, music, a merch shop and a chat space under one roof. It is run by Mwosa, a creator who streams, trains and fights, and it is built for people who want to level up together.',
    sections: [
      {
        h2: 'What The Homies is',
        html: `<p>The Homies started as a place for a community that kept forming around live streams. Instead of sending people to five different platforms, everything sits in one app at <strong>thehomies.app</strong>. You watch, you talk, you buy merch, you listen to music, and you support the people making it, all without leaving. You may also see the older address thehomieshub.com, which redirects here.</p>
<p>The audience is people who are working on themselves: getting fit, learning to box, building income, travelling and rethinking the nine-to-five. The tone is straight talk between friends rather than guru content, and the community is the part that makes it work.</p>`,
      },
      {
        h2: 'What is inside the app',
        html: `<ul>
<li><strong><a href="/live">Live streams</a>:</strong> real-time streams with chat, including <a href="/live-boxing-stream-community">fight nights</a> and commentary.</li>
<li><strong><a href="/browse">Clips and shorts</a>:</strong> a vertical video feed of the best moments, with likes, comments and sharing. Creators can upload their own.</li>
<li><strong><a href="/join">Homies Chat</a>:</strong> channels, direct messages and roles, built into the app.</li>
<li><strong><a href="/music">Music</a>:</strong> a streaming library with releases from Mwosa and other artists.</li>
<li><strong><a href="/shop">The shop</a>:</strong> <a href="/streetwear-merch">streetwear merch</a>, printed to order, with a studio to customize or design your own.</li>
<li><strong><a href="/community-chat-and-membership">Memberships</a>:</strong> a paid layer with members-only video, the full media library and the Digital Nomad program.</li>
<li><strong><a href="/donate">Donations</a> and <a href="/sponsor">fight purse support</a>:</strong> optional ways to back the platform and Mwosa's fights.</li>
</ul>`,
      },
      {
        h2: 'Who runs it',
        html: `<p>The Homies is created and run by <strong>Mwosa</strong>. He streams on the <a href="${YOUTUBE}" rel="noopener">YouTube channel</a>, makes the music in the library, trains and fights, and works with the small team that builds the app. Decisions about what goes in the app come from what the community asks for, and the product changes as the community does. If you have a suggestion, the best place to say it is in Homies Chat.</p>`,
      },
      {
        h2: 'How we think about the community',
        html: `<p>A community only works if people feel safe in it. The app has published <a href="/community-guidelines">community guidelines</a>, a <a href="/child-safety">child safety policy</a>, an <a href="/appeal">appeal process</a> for moderation decisions, and a <a href="/support">support page</a>. Our <a href="/privacy">privacy policy</a> and <a href="/terms">terms</a> explain how accounts and payments are handled. Content on the platform is aimed at adults.</p>
<p>We also try to be honest about the numbers and the product. If something is not live yet, we do not sell it as if it is. That is a boring thing to say about a brand, but it is why people stick around.</p>`,
      },
      {
        h2: 'How to get started',
        html: `<p>The quickest path: open <a href="/join">Join</a>, sign in with Discord or Google, say hello in the chat, then head to <a href="/live">Live</a> or <a href="/browse">Browse</a> to see what is on. If you like what you see, look at the <a href="/community-chat-and-membership">membership tiers</a> or grab something from the <a href="/shop">shop</a>. Everything at the start is free.</p>`,
      },
    ],
    faq: [
      { q: 'What is The Homies?', a: 'A community app with live streams, short clips, music, a merch shop and a built-in chat, run by Mwosa.' },
      { q: 'What is thehomieshub.com?', a: 'It is the older address for The Homies. If you land on thehomieshub.com, it redirects to thehomies.app.' },
      { q: 'Is it free?', a: 'Joining the chat and watching shorts and music is free. Paid memberships and merch are optional.' },
      { q: 'Where do I watch the streams?', a: 'On the YouTube channel and in the Live section of the app.' },
    ],
    related: ['/live-boxing-stream-community', '/streetwear-merch', '/community-chat-and-membership'],
  },
];

export const HOME = {
  title: 'The Homies | Live Streams, Clips, Merch & Community',
  description: 'The Homies is a community app for live boxing streams, short clips, music, streetwear merch and chat. Join free at thehomies.app.',
  h1: 'The Homies',
  lead: 'A community built for people who are leveling up. Watch live streams, swipe through clips, talk in Homies Chat, listen to music and wear the merch, all in one app.',
};

export const SHOP_PAGE = {
  path: '/shop',
  title: 'The Homies Shop | Streetwear Tees, Hoodies, Hats',
  description: 'Official The Homies merch: tees from {{teeFrom}}, hoodies from {{hoodieFrom}}, dad hats from {{hatFrom}}. Printed to order. Customize or design your own.',
  h1: 'The Homies Shop',
  lead: 'Official The Homies streetwear, printed to order. Tees, hoodies and embroidered dad hats with phrases from the streams. Customize any piece or design your own.',
};
