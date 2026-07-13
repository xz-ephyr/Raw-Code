import { subagentRunTool } from '@doktor/subagent';
import { webSearchTool } from '@core/tools/web/webSearchTool';
import { writeArtifactTool } from './writeArtifactTool';
import { gmailListMessagesTool, gmailReadMessageTool, gmailSendMessageTool } from './gmail/index';
import { githubListReposTool, githubListIssuesTool, githubListPRsTool, githubSearchCodeTool } from './github/index';
import { youtubeSearchVideosTool, youtubeListPlaylistsTool, youtubeListCommentsTool } from './youtube/index';
import { telegramSendMessageTool, telegramGetChatTool } from './telegram/index';
import { redditGetHotTool, redditSearchPostsTool, redditSubmitPostTool } from './reddit/index';
import { twitterGetTimelineTool, twitterPostTweetTool, twitterSearchTweetsTool, twitterGetUserTool } from './twitter/index';

export const allTools = [
  subagentRunTool,
  webSearchTool,
  writeArtifactTool,
  gmailListMessagesTool,
  gmailReadMessageTool,
  gmailSendMessageTool,
  githubListReposTool,
  githubListIssuesTool,
  githubListPRsTool,
  githubSearchCodeTool,
  youtubeSearchVideosTool,
  youtubeListPlaylistsTool,
  youtubeListCommentsTool,
  telegramSendMessageTool,
  telegramGetChatTool,
  redditGetHotTool,
  redditSearchPostsTool,
  redditSubmitPostTool,
  twitterGetTimelineTool,
  twitterPostTweetTool,
  twitterSearchTweetsTool,
  twitterGetUserTool,
];
