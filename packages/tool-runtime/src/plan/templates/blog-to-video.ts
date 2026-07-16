export function blogToVideoTemplate(input: {
  url?: string;
  topic?: string;
}) {
  const steps: Array<{
    description: string;
    toolName?: string;
    expectedInput?: Record<string, unknown>;
  }> = [];

  if (input.url) {
    // Scrape the blog post
    steps.push({
      description: `Scrape the blog post at ${input.url} to extract the full content`,
      toolName: 'scrape_url',
      expectedInput: { url: input.url, onlyMainContent: true, formats: ['markdown'] },
    });
  }

  // Generate script based on the topic or scraped content
  steps.push({
    description: `Generate a video script from the ${input.url ? 'scraped blog content' : `topic "${input.topic}"`}`,
    toolName: 'generate_script',
    expectedInput: {
      topic: input.topic || input.url || '',
      format: 'video',
      duration: '3-5 minutes',
    },
  });

  // Preview the video
  steps.push({
    description: 'Preview the rendered video to verify quality',
    toolName: 'preview_video',
    expectedInput: {},
  });

  // Export the final video
  steps.push({
    description: 'Export the final video for distribution',
    toolName: 'export_video',
    expectedInput: { format: 'mp4', quality: 'high' },
  });

  return {
    title: `Blog to Video: ${input.topic || input.url || 'Untitled'}`,
    steps,
  };
}
