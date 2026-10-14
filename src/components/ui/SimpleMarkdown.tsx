import { Fragment, type ReactNode } from 'react';

/** Rendu Markdown minimal et sûr (aucun HTML injecté) : titres, listes, gras, italique, code. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k++} className="rounded bg-elevated px-1 py-0.5 text-[0.85em]">{t.slice(1, -1)}</code>);
    else out.push(<em key={k++} className="text-muted">{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length} className={`${list.ordered ? 'list-decimal' : 'list-disc'} my-2 space-y-1 pl-5`}>
        {list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}
      </Tag>,
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const ordered = Boolean(ol);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    if (line.startsWith('### ')) blocks.push(<h4 key={blocks.length} className="mb-1 mt-3 font-semibold">{inline(line.slice(4))}</h4>);
    else if (line.startsWith('## ')) blocks.push(<h3 key={blocks.length} className="mb-1 mt-2 text-base font-bold">{inline(line.slice(3))}</h3>);
    else if (line.startsWith('# ')) blocks.push(<h3 key={blocks.length} className="mb-1 mt-2 text-lg font-bold">{inline(line.slice(2))}</h3>);
    else blocks.push(<p key={blocks.length} className="my-1.5">{inline(line)}</p>);
  }
  flush();
  return <Fragment>{blocks}</Fragment>;
}
