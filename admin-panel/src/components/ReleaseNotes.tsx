"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Release notes (extension changelog) rendered from a small, safe Markdown subset — headings,
 * bullet/numbered lists, bold/italic/code, links (http/https only) and rules — without injecting HTML.
 * Long notes are collapsed to `collapsedHeight` px with a fade and a "Show all" toggle.
 */

type Block =
  | { kind: "h"; level: number; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "p"; text: string }
  | { kind: "hr" };

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of src.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) { flush(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { flush(); blocks.push({ kind: "hr" }); continue; }
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flush(); blocks.push({ kind: "h", level: m[1].length, text: m[2] }); continue; }
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flush();
      const kind = ul ? "ul" : "ol";
      const text = (ul || ol)![1];
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push(text);
      else blocks.push({ kind, items: [text] });
      continue;
    }
    para.push(line);
  }
  flush();
  return blocks;
}

/** Inline: **bold**, *italic* / _italic_, `code`, [text](https://...) */
function inline(text: string, keyBase = ""): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*([^*]+)\*|_([^_]+)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[2] !== undefined) out.push(<strong key={k} className="font-semibold text-gray-900">{inline(m[2], k)}</strong>);
    else if (m[3] !== undefined) out.push(<code key={k} className="rounded bg-gray-100 px-1 py-px text-[0.85em]">{m[3]}</code>);
    else if (m[4] !== undefined) out.push(<a key={k} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline hover:text-primary-700">{m[4]}</a>);
    else out.push(<em key={k}>{inline((m[6] ?? m[7]) as string, k)}</em>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Rendered({ blocks, compact }: { blocks: Block[]; compact: boolean }) {
  return (
    <div className={cn("text-gray-700", compact ? "text-sm" : "text-sm sm:text-[15px]")}>
      {blocks.map((b, idx) => {
        const k = String(idx);
        if (b.kind === "hr") return <hr key={k} className="my-3 border-gray-200" />;
        if (b.kind === "h") {
          // h1 = release title, h2+ = section titles
          return b.level === 1 ? (
            <p key={k} className="mb-2 text-base font-semibold text-gray-900">{inline(b.text, k)}</p>
          ) : (
            <p key={k} className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500 first:mt-0">{inline(b.text, k)}</p>
          );
        }
        if (b.kind === "p") return <p key={k} className="my-1.5 leading-relaxed">{inline(b.text, k)}</p>;
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List key={k} className={cn("my-1.5 space-y-1 pl-5 leading-relaxed", b.kind === "ul" ? "list-disc marker:text-gray-400" : "list-decimal")}>
            {b.items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
          </List>
        );
      })}
    </div>
  );
}

export default function ReleaseNotes({
  text,
  collapsedHeight = 160,
  compact = false,
  className,
  fadeClassName = "from-white",
}: {
  text: string;
  collapsedHeight?: number;
  compact?: boolean;
  className?: string;
  /** Tailwind gradient start matching the background behind the notes */
  fadeClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const blocks = parseBlocks(text || "");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflows(el.scrollHeight > collapsedHeight + 24);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, collapsedHeight]);

  if (!blocks.length) return null;
  const clamped = overflows && !open;

  return (
    <div className={className}>
      <div className="relative">
        <div
          ref={ref}
          className="overflow-hidden transition-[max-height] duration-300"
          style={{ maxHeight: clamped ? collapsedHeight : undefined }}
        >
          <Rendered blocks={blocks} compact={compact} />
        </div>
        {clamped && <div className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent", fadeClassName)} />}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {open ? "Show less" : "Show all release notes"}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

