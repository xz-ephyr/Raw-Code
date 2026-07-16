export const citationRegex = /【([^】]+)】/g;

export interface SourceInfo {
  url: string;
  title: string;
  snippet?: string;
}

export type SourceIndex = ReturnType<typeof buildSourceIndex>;

export function buildSourceIndex(sources: SourceInfo[]): {
  byUrl: Map<string, SourceInfo>;
  byIndex: Map<number, SourceInfo>;
  byTitleLower: Map<string, SourceInfo[]>;
} {
  const byUrl = new Map<string, SourceInfo>();
  const byIndex = new Map<number, SourceInfo>();
  const byTitleLower = new Map<string, SourceInfo[]>();

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    if (s.url) byUrl.set(s.url, s);
    byIndex.set(i + 1, s);
    const lower = s.title.toLowerCase();
    if (!byTitleLower.has(lower)) byTitleLower.set(lower, []);
    byTitleLower.get(lower)!.push(s);
  }

  return { byUrl, byIndex, byTitleLower };
}

export function lookupCitation(text: string, index: SourceIndex): SourceInfo | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return index.byUrl.get(trimmed);
  }

  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num >= 1) {
    return index.byIndex.get(num);
  }

  const lower = trimmed.toLowerCase();
  const matches = index.byTitleLower.get(lower);
  if (matches) return matches[0];

  for (const [, sources] of index.byTitleLower) {
    for (const s of sources) {
      if (s.title.toLowerCase().includes(lower)) return s;
    }
  }

  return undefined;
}
