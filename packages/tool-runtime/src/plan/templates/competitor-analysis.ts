export interface PlanTemplateInput {
  topic: string;
  competitors?: string[];
}

export function competitorAnalysisTemplate(input: PlanTemplateInput) {
  const competitors = input.competitors || [];
  const hasCompetitors = competitors.length > 0;
  const searchQueries = hasCompetitors
    ? competitors
    : [`${input.topic} competitors`];

  const steps: Array<{
    description: string;
    toolName?: string;
    expectedInput?: Record<string, unknown>;
  }> = [];

  // Step 1-3: Search for each competitor
  for (const query of searchQueries) {
    steps.push({
      description: `Search the web for "${query}" information and recent developments`,
      toolName: 'web_search',
      expectedInput: { query, maxResults: 5 },
    });
  }

  // Step 4: Scrape competitor websites
  if (hasCompetitors) {
    for (const comp of competitors) {
      steps.push({
        description: `Scrape ${comp} to extract content: pricing, features, headings`,
        toolName: 'scrape_url',
        expectedInput: { url: `https://${comp}`, onlyMainContent: true },
      });
    }
  }

  // Step 5: Search for market landscape
  steps.push({
    description: `Search for "${input.topic}" market landscape and analysis`,
    toolName: 'web_search',
    expectedInput: { query: `${input.topic} market analysis 2026`, maxResults: 8 },
  });

  // Step 6: Write comparison article as artifact
  steps.push({
    description: `Write a comparison article analyzing the competitive landscape of "${input.topic}"`,
    toolName: 'write_artifact',
    expectedInput: {
      identifier: 'competitive-analysis',
      type: 'doc',
      title: `Competitive Analysis: ${input.topic}`,
      content: `# Competitive Analysis: ${input.topic}\n\nAnalysis will be compiled from search results and scraped pages.`,
    },
  });

  return {
    title: `Competitor Analysis: ${input.topic}`,
    steps,
  };
}
