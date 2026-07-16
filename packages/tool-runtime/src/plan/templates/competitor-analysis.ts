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
      toolName: 'research_compile',
      expectedInput: { query, maxSources: 5 },
    });
  }

  // Step 4: Crawl competitor websites for structured data
  if (hasCompetitors) {
    for (const comp of competitors) {
      steps.push({
        description: `Crawl ${comp} to extract structure: headings, pricing, features`,
        toolName: 'extract_structured',
        expectedInput: {
          url: `https://${comp}`,
          selectors: { headings: 'h1,h2', features: '.feature, .capability', pricing: '.price, .pricing' },
        },
      });
    }
  }

  // Step 5: Deep research compile on the topic
  steps.push({
    description: `Compile comprehensive research on "${input.topic}" market landscape`,
    toolName: 'research_compile',
    expectedInput: { query: `${input.topic} market analysis 2026`, maxSources: 8, extractStructure: { headings: 'h2', keyPoints: '.highlight, .key-point' } },
  });

  // Step 6: Write comparison article
  steps.push({
    description: `Write a comparison article analyzing the competitive landscape of "${input.topic}"`,
    toolName: 'write_article',
    expectedInput: {
      topic: `Competitive Analysis: ${input.topic}`,
      tone: 'professional',
      audience: 'product managers and developers evaluating solutions',
      wordCount: 2000,
    },
  });

  return {
    title: `Competitor Analysis: ${input.topic}`,
    steps,
  };
}
