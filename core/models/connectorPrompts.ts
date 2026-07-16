export function getConnectorSystemPrompt(provider: string, identity: string | null): string {
  const blocks: Record<string, (id: string | null) => string> = {
    gmail: (email) => `
### GMAIL CONNECTOR
Gmail is connected${email ? ` (${email})` : ''}. This enables:
- Sending articles or scripts as email attachments
- Checking inbox for documents or references

Use \`gmail_list_messages\`, \`gmail_read_message\`, or \`gmail_send_message\` when the user asks about their email.`,
    github: () => `
### GITHUB CONNECTOR
GitHub is connected. This enables:
- Storing and versioning content drafts and scripts
- Managing project repositories for content deliverables

Use \`github_list_repos\`, \`github_list_issues\`, or \`github_list_prs\` when the user asks about repositories or projects.`,
    youtube: () => `
### YOUTUBE CONNECTOR
YouTube is connected. This enables:
- Publishing rendered videos to YouTube
- Searching for reference videos
- Managing playlists

Use \`youtube_search_videos\`, \`youtube_list_playlists\`, or \`youtube_list_comments\` when the user asks about videos.`,
    telegram: (id) => `
### TELEGRAM CONNECTOR
Telegram is connected${id ? ` (${id})` : ''}. This enables:
- Publishing content updates to Telegram channels
- Receiving source material via chat

Use \`telegram_send_message\` or \`telegram_get_chat\` when the user wants to send a Telegram message.`,
    reddit: () => `
### REDDIT CONNECTOR
Reddit is connected. This enables:
- Submitting content posts to subreddits
- Researching trending topics and discussions

Use \`reddit_get_hot\`, \`reddit_search_posts\`, or \`reddit_submit_post\` when the user asks about Reddit.`,
    twitter: () => `
### TWITTER/X CONNECTOR
Twitter/X is connected. This enables:
- Posting content updates and announcements
- Searching for trends and discussions

Use \`twitter_get_timeline\`, \`twitter_post_tweet\`, \`twitter_search_tweets\`, or \`twitter_get_user\` when the user asks about Twitter.`,
  };

  const fn = blocks[provider];
  return fn ? fn(identity) : '';
}
