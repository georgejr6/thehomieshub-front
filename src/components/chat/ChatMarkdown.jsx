import React, { useState } from 'react';

// Discord-flavored markdown for chat messages, rendered to React elements
// (never innerHTML): **bold** *italic* _italic_ __underline__ ~~strike~~
// `code` ```blocks``` ||spoiler|| > quotes, links, <@user> <@&role>
// <#channel> mentions, @everyone/@here, and Discord custom emoji <:name:id>.

const hex = (n) => `#${Number(n || 0).toString(16).padStart(6, '0')}`;

function Spoiler({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      onClick={() => setOpen(true)}
      className={open ? 'rounded bg-white/10 px-0.5' : 'cursor-pointer rounded bg-[#1E1F22] px-0.5 text-transparent hover:bg-[#2B2D31] [&_*]:invisible'}
    >
      {children}
    </span>
  );
}

// Inline rules, tried in order at each position.
const RULES = [
  { re: /^```(?:[\w+-]*\n)?([\s\S]*?)```/, render: (m, k) => <pre key={k} className="my-1 max-w-full overflow-x-auto whitespace-pre-wrap rounded border border-[#1E1F22] bg-[#2B2D31] p-2 font-mono text-[13px] text-[#DBDEE1]">{m[1].replace(/\n$/, '')}</pre> },
  { re: /^`([^`\n]+)`/, render: (m, k) => <code key={k} className="rounded bg-[#1E1F22] px-1 py-0.5 font-mono text-[85%]">{m[1]}</code> },
  { re: /^\|\|([\s\S]+?)\|\|/, render: (m, k, ctx) => <Spoiler key={k}>{parseInline(m[1], ctx)}</Spoiler> },
  { re: /^\*\*([\s\S]+?)\*\*/, render: (m, k, ctx) => <strong key={k} className="font-semibold">{parseInline(m[1], ctx)}</strong> },
  { re: /^__([\s\S]+?)__/, render: (m, k, ctx) => <u key={k}>{parseInline(m[1], ctx)}</u> },
  { re: /^~~([\s\S]+?)~~/, render: (m, k, ctx) => <s key={k}>{parseInline(m[1], ctx)}</s> },
  { re: /^\*([^*\s][^*]*?)\*/, render: (m, k, ctx) => <em key={k}>{parseInline(m[1], ctx)}</em> },
  { re: /^_([^_\s][^_]*?)_(?![A-Za-z0-9])/, render: (m, k, ctx) => <em key={k}>{parseInline(m[1], ctx)}</em> },
  {
    re: /^<@!?([a-f0-9]{24}|\d{15,21})>/,
    render: (m, k, ctx) => {
      const u = ctx.users?.[m[1]];
      const self = m[1] === ctx.meId;
      return (
        <span key={k} className={`cursor-pointer rounded px-0.5 font-medium ${self ? 'bg-[#F0B232]/25 text-[#F0B232]' : 'bg-[#5865F2]/25 text-[#C9CDFB] hover:bg-[#5865F2]'}`}>
          @{u?.displayName || u?.username || 'unknown-user'}
        </span>
      );
    },
  },
  {
    re: /^<@&([a-f0-9]{24}|\d{15,21})>/,
    render: (m, k, ctx) => {
      const r = ctx.roles?.find((x) => x.id === m[1]);
      const c = r?.color ? hex(r.color) : '#C9CDFB';
      return <span key={k} className="rounded px-0.5 font-medium" style={{ color: c, background: `${c}26` }}>@{r?.name || 'deleted-role'}</span>;
    },
  },
  {
    re: /^<#([a-f0-9]{24}|\d{15,21})>/,
    render: (m, k, ctx) => {
      const ch = ctx.channels?.find((x) => x.id === m[1]);
      return (
        <span key={k} onClick={() => ch && ctx.openChannel?.(ch.id)} className="cursor-pointer rounded bg-[#5865F2]/25 px-0.5 font-medium text-[#C9CDFB] hover:bg-[#5865F2]">
          #{ch?.name || 'unknown'}
        </span>
      );
    },
  },
  { re: /^@(everyone|here)\b/, render: (m, k) => <span key={k} className="rounded bg-[#5865F2]/25 px-0.5 font-medium text-[#C9CDFB]">@{m[1]}</span> },
  {
    re: /^<(a?):(\w{2,32}):(\d{15,21})>/,
    render: (m, k) => <img key={k} alt={`:${m[2]}:`} title={`:${m[2]}:`} className="inline-block h-[1.375em] w-[1.375em] object-contain align-bottom" src={`https://cdn.discordapp.com/emojis/${m[3]}.${m[1] ? 'gif' : 'webp'}?size=48`} />,
  },
  {
    re: /^<?(https?:\/\/[^\s<>]+[^\s<>.,:;"')\]!?])>?/,
    render: (m, k) => <a key={k} href={m[1]} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-[#00A8FC] hover:underline">{m[1]}</a>,
  },
];

export function parseInline(text, ctx) {
  const out = [];
  let buf = '';
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    // Backslash escapes a markdown character.
    if (rest[0] === '\\' && /[*_~`|\\<>#@]/.test(rest[1] || '')) {
      buf += rest[1];
      i += 2;
      continue;
    }
    let hit = null;
    // Cheap first-char gate before running regexes.
    if ('`|*_~<@h'.includes(rest[0])) {
      for (const rule of RULES) {
        const m = rest.match(rule.re);
        if (m) { hit = { m, rule }; break; }
      }
    }
    if (hit) {
      if (buf) { out.push(buf); buf = ''; }
      out.push(hit.rule.render(hit.m, `k${key++}`, ctx));
      i += hit.m[0].length;
    } else {
      buf += rest[0];
      i += 1;
    }
  }
  if (buf) out.push(buf);
  return out;
}

// Block level: quote lines ("> ") group into a bar; everything else inline.
export default function ChatMarkdown({ text, ctx }) {
  if (!text) return null;
  const lines = text.split('\n');
  const blocks = [];
  let para = [];
  let quote = [];
  const flush = () => {
    if (para.length) { blocks.push({ t: 'p', text: para.join('\n') }); para = []; }
    if (quote.length) { blocks.push({ t: 'q', text: quote.join('\n') }); quote = []; }
  };
  let inFence = false;
  for (const line of lines) {
    if ((line.match(/```/g) || []).length % 2 === 1) inFence = !inFence;
    const isQuote = !inFence && /^>\s/.test(line);
    if (isQuote) {
      if (para.length) { blocks.push({ t: 'p', text: para.join('\n') }); para = []; }
      quote.push(line.replace(/^>\s/, ''));
    } else {
      if (quote.length) { blocks.push({ t: 'q', text: quote.join('\n') }); quote = []; }
      para.push(line);
    }
  }
  flush();
  return (
    <>
      {blocks.map((b, i) =>
        b.t === 'q' ? (
          <div key={i} className="my-0.5 flex">
            <div className="mr-2 w-1 shrink-0 rounded bg-[#4E5058]" />
            <div className="min-w-0 whitespace-pre-wrap break-words">{parseInline(b.text, ctx)}</div>
          </div>
        ) : (
          <div key={i} className="whitespace-pre-wrap break-words">{parseInline(b.text, ctx)}</div>
        )
      )}
    </>
  );
}

export const roleColor = hex;
