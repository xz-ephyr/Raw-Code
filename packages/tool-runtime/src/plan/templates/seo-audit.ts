export function seoAuditTemplate(input: {
  url: string;
  maxPages?: number;
}) {
  const maxPages = input.maxPages ?? 30;

  const steps: Array<{
    description: string;
    toolName?: string;
    expectedInput?: Record<string, unknown>;
  }> = [];

  // Step 1: Scrape the homepage
  steps.push({
    description: `Scrape ${input.url} to extract full content and headings`,
    toolName: 'scrape_url',
    expectedInput: { url: input.url, onlyMainContent: false, formats: ['markdown'] },
  });

  // Step 2: Crawl the site
  steps.push({
    description: `Crawl up to ${maxPages} pages from ${input.url} for content analysis`,
    toolName: 'crawl_website',
    expectedInput: { url: input.url, maxPages, maxDepth: 2 },
  });

  // Step 3: Search for current SEO best practices
  steps.push({
    description: 'Search for current SEO best practices and audit checklist',
    toolName: 'web_search',
    expectedInput: { query: 'SEO best practices technical audit checklist 2026', maxResults: 5 },
  });

  // Step 4: Write audit report as artifact
  steps.push({
    description: 'Write a comprehensive SEO audit report with findings and recommendations',
    toolName: 'write_artifact',
    expectedInput: {
      identifier: 'seo-audit-report',
      type: 'doc',
      title: `SEO Audit Report: ${input.url}`,
      content: '## SEO Audit Report\n\nFindings and recommendations will be compiled here.',
    },
  });

  return {
    title: `SEO Audit: ${input.url}`,
    steps,
  };
}
