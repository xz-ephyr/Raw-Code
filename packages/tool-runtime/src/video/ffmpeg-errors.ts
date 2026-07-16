const TRANSIENT_PATTERNS: RegExp[] = [
  /Connection reset by peer/i,
  /Timeout/i,
  /Timed out/i,
  /Temporary failure/i,
  /Resource temporarily unavailable/i,
  /Cannot allocate memory/i,
  /Unable to open/i,
  /Error while opening encoder/i,
  /Broken pipe/i,
  /Input output error/i,
  /Protocol error/i,
  /Rate limit/i,
];

const PERMANENT_PATTERNS: RegExp[] = [
  /Invalid data found when processing input/i,
  /Unknown encoder/i,
  /Unknown decoder/i,
  /No such file or directory/i,
  /Invalid argument/i,
  /Unsupported codec/i,
  /Malformed/i,
  /Invalid pixel format/i,
  /Codec did not produce any data/i,
  /Picture size invalid/i,
  /Dimensions not set/i,
  /Error opening filters/i,
  /Filter.*not found/i,
  /Fontconfig.*failed/i,
  /Error initializing/i,
];

const RETRYABLE_LOG_PATTERNS: RegExp[] = [
  /ffmpeg.*exit code.*(1|127)/i,
  /signal/i,
];

export function classifyError(logSnippet: string): 'transient' | 'permanent' | 'unknown' {
  for (const p of PERMANENT_PATTERNS) {
    if (p.test(logSnippet)) return 'permanent';
  }
  for (const p of TRANSIENT_PATTERNS) {
    if (p.test(logSnippet)) return 'transient';
  }
  if (RETRYABLE_LOG_PATTERNS.some((p) => p.test(logSnippet))) return 'transient';
  return 'unknown';
}
