export function processUrl(input: string): string {
  let url = input.trim();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export function searchOrNavigate(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return 'about:blank';

  const urlPattern = /^[a-zA-Z][a-zA-Z0-9]*:\/\//;
  const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/|$|:)/;
  const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?(\/|$)/;
  const localhostPattern = /^localhost(:\d+)?(\/|$)/;

  if (urlPattern.test(trimmed) || domainPattern.test(trimmed) || ipPattern.test(trimmed) || localhostPattern.test(trimmed)) {
    return processUrl(trimmed);
  }

  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}
