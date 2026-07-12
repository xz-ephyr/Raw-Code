import { readFileTool } from './code/readFile';
import { writeFileTool } from './code/writeFile';
import { editFileTool } from './code/editFile';
import { listDirectoryTool } from './code/listDirectory';
import { searchCodebaseTool } from './code/searchCodebase';
import { runCommandTool } from './system/runCommand';
import { webSearchTool } from '@core/tools/web/webSearchTool';
import { writeArtifactTool } from './writeArtifactTool';
import { subagentRunTool } from './agent/subagentRun';
import { gmailListMessagesTool, gmailReadMessageTool, gmailSendMessageTool } from './gmail/index';
import { githubListReposTool, githubListIssuesTool, githubListPRsTool, githubSearchCodeTool } from './github/index';
import { youtubeSearchVideosTool, youtubeListPlaylistsTool, youtubeListCommentsTool } from './youtube/index';
import { telegramSendMessageTool, telegramGetChatTool } from './telegram/index';
import { redditGetHotTool, redditSearchPostsTool, redditSubmitPostTool } from './reddit/index';
import { twitterGetTimelineTool, twitterPostTweetTool, twitterSearchTweetsTool, twitterGetUserTool } from './twitter/index';

export const allTools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  searchCodebaseTool,
  runCommandTool,
  webSearchTool,
  writeArtifactTool,
  subagentRunTool,
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
