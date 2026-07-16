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

  // Step 1: Map the site
  steps.push({
    description: `Map all discoverable URLs on ${input.url} via sitemap and link crawling`,
    toolName: 'map_site',
    expectedInput: { url: input.url },
  });

  // Step 2: Crawl the site
  steps.push({
    description: `Crawl up to ${maxPages} pages from ${input.url} for content analysis`,
    toolName: 'crawl_website',
    expectedInput: { url: input.url, maxPages, maxDepth: 2 },
  });

  // Step 3: Extract headings and meta from homepage
  steps.push({
    description: `Extract structured data from ${input.url}: headings, meta descriptions, links`,
    toolName: 'extract_structured',
    expectedInput: {
      url: input.url,
      selectors: {
        headings: 'h1,h2,h3',
        metaDescriptions: 'meta[name="description"]',
        canonical: 'link[rel="canonical"]',
        images: 'img[alt]',
      },
    },
  });

  // Step 4: Research SEO best practices
  steps.push({
    description: 'Research current SEO best practices for comparison',
    toolName: 'research',
    expectedInput: { query: 'SEO best practices technical audit checklist 2026', depth: 'quick' },
  });

  // Step 5: Write audit report
  steps.push({
    description: 'Write a comprehensive SEO audit report with findings and recommendations',
    toolName: 'write_article',
    expectedInput: {
      topic: `SEO Audit Report: ${input.url}`,
      tone: 'professional',
      audience: 'web developers and SEO specialists',
      wordCount: 2500,
    },
  });

  return {
    title: `SEO Audit: ${input.url}`,
    steps,
  };
}
