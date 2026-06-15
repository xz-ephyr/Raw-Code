import React from 'react';

type Block =
  | { type: 'code'; content: string; language?: string }
  | { type: 'heading'; level: 1 | 2 | 3; content: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'paragraph'; content: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let codeLines: string[] = [];
  let codeLanguage = '';
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraph.join('\n') });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', ordered: listOrdered, items: listItems });
      listItems = [];
    }
  };

  lines.forEach((line) => {
    const codeFence = line.match(/^```\s*([\w-]*)\s*$/);

    if (codeFence) {
      if (inCodeBlock) {
        blocks.push({ type: 'code', language: codeLanguage || undefined, content: codeLines.join('\n') });
        codeLines = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLanguage = codeFence[1] || '';
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, content: heading[2] });
      return;
    }

    const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
    const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unorderedItem || orderedItem) {
      flushParagraph();
      const ordered = Boolean(orderedItem);
      if (listItems.length > 0 && listOrdered !== ordered) {
        flushList();
      }
      listOrdered = ordered;
      listItems.push((orderedItem || unorderedItem)?.[1] || '');
      return;
    }

    flushList();
    paragraph.push(line);
  });

  if (inCodeBlock) {
    blocks.push({ type: 'code', language: codeLanguage || undefined, content: codeLines.join('\n') });
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-neutral-100 px-1 py-0.5 text-[0.9em] text-neutral-800">
          {part.slice(1, -1)}
        </code>
      );
    }

    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-3 break-words [overflow-wrap:anywhere]">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return <h1 key={index} className="text-xl font-semibold">{renderInline(block.content)}</h1>;
          }

          if (block.level === 2) {
            return <h2 key={index} className="text-lg font-semibold">{renderInline(block.content)}</h2>;
          }

          return <h3 key={index} className="text-base font-semibold">{renderInline(block.content)}</h3>;
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          const listClassName = block.ordered ? 'list-decimal space-y-1 pl-5' : 'list-disc space-y-1 pl-5';

          return (
            <ListTag key={index} className={listClassName}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }

        if (block.type === 'code') {
          return (
            <pre key={index} className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">
              {block.language && <div className="mb-2 text-[11px] uppercase tracking-wide text-neutral-400">{block.language}</div>}
              <code className="whitespace-pre">{block.content}</code>
            </pre>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap leading-6">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
}
