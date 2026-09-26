import type { ReactNode } from "react";
import styles from "./MarkdownContent.module.css";

/**
 * Renders the Insight `content` field (`insights.schema.ts`: "Markdown", a
 * plain-text column — no CMS rich-text editor exists yet). No dependency was
 * added (phase brief §31/`FRONTEND_ARCHITECTURE.md` §12's conservative-dependency
 * posture): this is a small, safe, block-then-inline parser covering exactly the
 * structures the phase brief names — headings, paragraphs, lists, quotes, links,
 * images, bold/italic (§13) — nothing is rendered via `dangerouslySetInnerHTML`,
 * so there is no injection surface even though the source is user-authored text.
 * Unsupported syntax (tables, embedded video) is not invented; it renders as
 * plain paragraph text, matching "do not invent a new content format" (§13).
 */

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const isUl = (l: string) => /^[-*]\s+/.test(l);
  const isOl = (l: string) => /^\d+\.\s+/.test(l);
  const isQuote = (l: string) => /^>\s?/.test(l);

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length as 2 | 3, text: heading[2].trim() });
      i++;
      continue;
    }
    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    if (isQuote(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && isQuote(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", text: quoteLines.join(" ") });
      continue;
    }
    // Paragraph: accumulate until a blank line or the start of another block type.
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !isUl(lines[i].trim()) && !isOl(lines[i].trim()) && !isQuote(lines[i].trim()) && !/^(#{2,3})\s+/.test(lines[i].trim())) {
      paragraphLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
  }
  return blocks;
}

/** Inline: `![alt](url)` images, `[text](url)` links, `**bold**`, `*italic*`/`_italic_`. Plain text otherwise. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /!\[([^\]]*)\]\(([^)\s]+)\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|[*_]([^*_]+)[*_]/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${n++}`;
    if (match[1] !== undefined) {
      // eslint-disable-next-line @next/next/no-img-element -- inline article content image, dimensions are not known ahead of time; not the page's hero/featured image (which uses `Media`/`next/image`).
      nodes.push(<img key={key} src={match[2]} alt={match[1]} loading="lazy" className={styles.inlineImage} />);
    } else if (match[3] !== undefined) {
      nodes.push(<a key={key} href={match[4]}>{match[3]}</a>);
    } else if (match[5] !== undefined) {
      nodes.push(<strong key={key}>{match[5]}</strong>);
    } else if (match[6] !== undefined) {
      nodes.push(<em key={key}>{match[6]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function MarkdownContent({ content }: { content: string }) {
  if (!content.trim()) return null;
  const blocks = parseBlocks(content);
  return (
    <div className={styles.content}>
      {blocks.map((block, i) => {
        const key = `block-${i}`;
        if (block.kind === "heading") {
          const Tag = block.level === 2 ? "h2" : "h3";
          return <Tag key={key}>{renderInline(block.text, key)}</Tag>;
        }
        if (block.kind === "ul") return <ul key={key}>{block.items.map((item, j) => <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>)}</ul>;
        if (block.kind === "ol") return <ol key={key}>{block.items.map((item, j) => <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>)}</ol>;
        if (block.kind === "quote") return <blockquote key={key}><p>{renderInline(block.text, key)}</p></blockquote>;
        return <p key={key}>{renderInline(block.text, key)}</p>;
      })}
    </div>
  );
}
