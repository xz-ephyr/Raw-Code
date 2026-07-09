import { readFileTool } from './code/readFile';
import { writeFileTool } from './code/writeFile';
import { editFileTool } from './code/editFile';
import { listDirectoryTool } from './code/listDirectory';
import { searchCodebaseTool } from './code/searchCodebase';
import { runCommandTool } from './system/runCommand';
import { webSearchTool } from '@core/tools/web/webSearchTool';
import { writeArtifactTool } from './writeArtifactTool';
import { subagentRunTool } from './agent/subagentRun';

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
];
