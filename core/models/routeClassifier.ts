type Route = 'direct' | 'subagent';

const SUBAGENT_TRIGGERS = [
  /research/i,
  /investigate/i,
  /analyze/i,
  /write.*article/i,
  /generate.*script/i,
  /create.*video/i,
  /crawl/i,
  /scrape/i,
  /compare/i,
  /summarize/i,
  /multi.?step/i,
  /pipeline/i,
  /complex/i,
  /in.?depth/i,
  /thorough/i,
  /deep.?dive/i,
  /compose/i,
  /parallel/i,
  /synthesize/i,
];

export function classifyMessage(text: string): Route {
  if (text.length < 15) return 'direct';

  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  if (sentenceCount >= 4) return 'subagent';

  const matchCount = SUBAGENT_TRIGGERS.filter(re => re.test(text)).length;
  if (matchCount >= 2) return 'subagent';
  if (matchCount === 1 && text.length > 80) return 'subagent';

  return 'direct';
}
