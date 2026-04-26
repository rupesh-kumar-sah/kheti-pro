import React from 'react';

interface RichTextProps {
  text: string;
  className?: string;
}

const inline = (raw: string, keyPrefix: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(raw.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key} className="font-semibold text-gray-900 dark:text-white">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key} className="px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[0.85em] font-mono">{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < raw.length) nodes.push(raw.slice(lastIndex));
  return nodes;
};

interface Block {
  type: 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'hr';
  lines: string[];
}

const parseBlocks = (text: string): Block[] => {
  const blocks: Block[] = [];
  const rawLines = text.replace(/\r\n/g, '\n').split('\n');
  let cur: Block | null = null;

  const flush = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };

  for (const rawLine of rawLines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flush();
      blocks.push({ type: 'hr', lines: [] });
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    const h3 = line.match(/^###\s+(.*)$/);
    if (h2 || h3) {
      flush();
      blocks.push({ type: h2 ? 'h2' : 'h3', lines: [(h2 || h3)![1]] });
      continue;
    }
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ol) {
      if (!cur || cur.type !== 'ol') {
        flush();
        cur = { type: 'ol', lines: [] };
      }
      cur.lines.push(ol[2]);
      continue;
    }
    if (ul) {
      if (!cur || cur.type !== 'ul') {
        flush();
        cur = { type: 'ul', lines: [] };
      }
      cur.lines.push(ul[1]);
      continue;
    }
    if (!cur || cur.type !== 'p') {
      flush();
      cur = { type: 'p', lines: [] };
    }
    cur.lines.push(line);
  }
  flush();
  return blocks;
};

const RichText: React.FC<RichTextProps> = ({ text, className }) => {
  const blocks = parseBlocks(text || '');

  return (
    <div className={`space-y-3 leading-relaxed text-[0.95rem] ${className || ''}`}>
      {blocks.map((b, idx) => {
        const key = `b-${idx}`;
        if (b.type === 'hr') return <hr key={key} className="border-gray-200 dark:border-gray-700" />;
        if (b.type === 'h2') {
          return (
            <h3 key={key} className="text-base font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mt-2">
              <span className="inline-block w-1.5 h-5 bg-emerald-500 rounded-full" />
              {inline(b.lines[0], `${key}-h2`)}
            </h3>
          );
        }
        if (b.type === 'h3') {
          return (
            <h4 key={key} className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-2">
              {inline(b.lines[0], `${key}-h3`)}
            </h4>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={key} className="space-y-1.5 pl-1">
              {b.lines.map((ln, i) => (
                <li key={`${key}-li-${i}`} className="flex gap-2 items-start">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{inline(ln, `${key}-li-${i}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={key} className="space-y-2">
              {b.lines.map((ln, i) => (
                <li key={`${key}-oli-${i}`} className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{inline(ln, `${key}-oli-${i}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={key} className="text-gray-700 dark:text-gray-200">
            {b.lines.map((ln, i) => (
              <React.Fragment key={`${key}-p-${i}`}>
                {i > 0 && <br />}
                {inline(ln, `${key}-p-${i}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

export default RichText;
