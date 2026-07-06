import { readFileTool } from './code/readFile';
import { writeFileTool } from './code/writeFile';
import { editFileTool } from './code/editFile';
import { listDirectoryTool } from './code/listDirectory';
import { findFilesTool } from './code/findFiles';
import { grepFilesTool } from './code/grepFiles';
import { codeSearchTool } from './code/codeSearch';
import { fileStatsTool } from './code/fileStats';
import { countLinesTool } from './code/countLines';
import { globFilesTool } from './code/globFiles';
import { gitStatusTool } from './git/gitStatus';
import { gitDiffTool } from './git/gitDiff';
import { gitLogTool } from './git/gitLog';
import { gitBranchesTool } from './git/gitBranches';
import { gitShowTool } from './git/gitShow';
import { runCommandTool } from './system/runCommand';
import { systemInfoTool } from './system/systemInfo';
import { listProcessesTool } from './system/listProcesses';
import { resolvePathTool } from './system/resolvePath';
import { httpRequestTool } from './network/httpRequest';
import { checkUrlTool } from './network/checkUrl';
import { webSearchTool, fetchPageTool, imageSearchTool, newsSearchTool } from '@core/tools/web/webSearchTool';
import { subagentRunTool } from './agent/subagentRun';

export const allTools = [
  readFileTool,
  writeFileTool,
  editFileTool,
  listDirectoryTool,
  findFilesTool,
  grepFilesTool,
  codeSearchTool,
  fileStatsTool,
  countLinesTool,
  globFilesTool,
  gitStatusTool,
  gitDiffTool,
  gitLogTool,
  gitBranchesTool,
  gitShowTool,
  runCommandTool,
  systemInfoTool,
  listProcessesTool,
  resolvePathTool,
  httpRequestTool,
  checkUrlTool,
  webSearchTool,
  fetchPageTool,
  imageSearchTool,
  newsSearchTool,
  subagentRunTool,
];
