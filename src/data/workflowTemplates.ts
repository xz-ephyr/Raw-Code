import type { Workflow } from '@/types/workflow';

export interface TemplateMeta {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  connectors: string[];
  steps: Workflow['steps'];
}

export const WORKFLOW_TEMPLATES: TemplateMeta[] = [
  {
    id: 'tpl-email-campaign',
    title: 'Email Campaign',
    description: 'Draft and send email campaigns via Gmail with AI-generated content and analytics.',
    longDescription: 'Automate your email marketing by researching your audience, generating personalized campaign content, and sending it directly through Gmail. Supports A/B testing and follow-up sequences.',
    connectors: ['Gmail'],
    steps: [
      { id: 'tpl-email-1', type: 'sub_agent', label: 'Research Audience', description: 'Analyze target audience and campaign goals', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-email-2', type: 'tool_call', label: 'Generate Content', description: 'Create email copy from research', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-email-3', type: 'connector', label: 'Send via Gmail', description: 'Deliver campaign to recipients', config: {}, collapsed: true, status: 'idle' },
    ],
  },
  {
    id: 'tpl-repo-watch',
    title: 'Repo Watch',
    description: 'Monitor GitHub repos, issues, and PRs with AI-powered summaries.',
    longDescription: 'Track multiple GitHub repositories for new issues, pull requests, and releases. Automatically summarizes changes and delivers a daily digest to your preferred channel.',
    connectors: ['GitHub'],
    steps: [
      { id: 'tpl-repo-1', type: 'connector', label: 'Fetch Issues', description: 'Get latest issues from GitHub', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-repo-2', type: 'tool_call', label: 'Summarize Changes', description: 'Generate summary of new activity', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-repo-3', type: 'llm', label: 'Format Report', description: 'Structure the digest', config: {}, collapsed: true, status: 'idle' },
    ],
  },
  {
    id: 'tpl-social-poster',
    title: 'Social Poster',
    description: 'Create and publish social content across Twitter and Reddit automatically.',
    longDescription: 'Plan, generate, and schedule social media posts. Researches trending topics in your niche, drafts platform-optimized content, and publishes to Twitter and Reddit on a schedule.',
    connectors: ['Twitter', 'Reddit'],
    steps: [
      { id: 'tpl-social-1', type: 'sub_agent', label: 'Trend Research', description: 'Find trending topics in your niche', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-social-2', type: 'tool_call', label: 'Draft Posts', description: 'Generate platform-optimized content', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-social-3', type: 'connector', label: 'Publish Twitter', description: 'Post to Twitter', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-social-4', type: 'connector', label: 'Publish Reddit', description: 'Post to Reddit communities', config: {}, collapsed: true, status: 'idle' },
    ],
  },
  {
    id: 'tpl-youtube-digest',
    title: 'YouTube Digest',
    description: 'Monitor YouTube channels and get AI summaries of new video uploads.',
    longDescription: 'Subscribe to YouTube channels and receive intelligent summaries of new uploads. Extracts key points, transcripts, and generates actionable insights from video content.',
    connectors: ['YouTube'],
    steps: [
      { id: 'tpl-yt-1', type: 'connector', label: 'Check Channel', description: 'Fetch latest videos from channels', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-yt-2', type: 'tool_call', label: 'Transcribe & Summarize', description: 'Extract key points from videos', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-yt-3', type: 'tool_call', label: 'Generate Digest', description: 'Compile summaries into digest', config: {}, collapsed: true, status: 'idle' },
    ],
  },
  {
    id: 'tpl-slack-briefing',
    title: 'Slack Briefing',
    description: 'Summarize Slack channels and deliver daily team briefings with action items.',
    longDescription: 'Aggregate messages from multiple Slack channels, extract key decisions and action items, and deliver a daily briefing to keep your team aligned without reading every message.',
    connectors: ['Slack'],
    steps: [
      { id: 'tpl-slack-1', type: 'connector', label: 'Read Channels', description: 'Fetch messages from channels', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-slack-2', type: 'sub_agent', label: 'Extract Insights', description: 'Identify key decisions and action items', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-slack-3', type: 'tool_call', label: 'Write Briefing', description: 'Compile daily briefing', config: {}, collapsed: true, status: 'idle' },
    ],
  },
  {
    id: 'tpl-video-edit',
    title: 'Video Edit',
    description: 'Trim, scale, overlay, and concatenate videos using FFmpeg on GitHub Actions.',
    longDescription: 'Upload a source video to Google Drive, define edit operations (trim, speed, crop, overlay, concat, drawtext, color, audio mix, normalize, GIF export), and process it via an FFmpeg pipeline on GitHub Actions free runners. Results upload back to Drive.',
    connectors: ['Google Drive', 'GitHub'],
    steps: [
      { id: 'tpl-video-1', type: 'connector', label: 'Upload to Drive', description: 'Upload source video to appDataFolder', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-video-2', type: 'video_edit', label: 'Run Pipeline', description: 'Dispatch FFmpeg pipeline on GH Actions', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-video-3', type: 'connector', label: 'Download Result', description: 'Pull processed video from Drive', config: {}, collapsed: true, status: 'idle' },
    ],
  },
  {
    id: 'tpl-research-report',
    title: 'Research Report',
    description: 'Deep research with web search, compile findings into detailed reports.',
    longDescription: 'Conduct comprehensive research on any topic. Performs iterative web searches, deep-dive analysis with sub-agents, and compiles everything into a structured, citable report.',
    connectors: [],
    steps: [
      { id: 'tpl-research-1', type: 'tool_call', label: 'Initial Search', description: 'Broad web search on topic', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-research-2', type: 'sub_agent', label: 'Deep Dive', description: 'Analyze findings and identify gaps', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-research-3', type: 'tool_call', label: 'Follow-up Search', description: 'Fill knowledge gaps', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-research-4', type: 'sub_agent', label: 'Compile Report', description: 'Synthesize into structured report', config: {}, collapsed: true, status: 'idle' },
      { id: 'tpl-research-5', type: 'llm', label: 'Review & Refine', description: 'Final polish', config: {}, collapsed: true, status: 'idle' },
    ],
  },
];
