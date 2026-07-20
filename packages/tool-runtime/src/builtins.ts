import { registerGlobalBatch, type GlobalRegistryEntry } from './registry/global';
import { questionTool } from './content/question';
import { webSearchTool } from './content/web-search';
import { scrapeUrlTool } from './content/scrape-url';
import { renderVideoTool } from './video/render-video';
import { editVideoTool } from './video/edit-video';
import { exportVideoTool } from './video/export-video';
import { previewVideoTool } from './video/preview-video';
import { pollRenderJobTool } from './video/poll-render-job';
import { createPlanTool } from './plan/create-plan';
import { executePlanTool } from './plan/execute-plan';

export function registerContentTools(source: GlobalRegistryEntry['source'] = 'content'): void {
  registerGlobalBatch({
    question: questionTool,
    web_search: webSearchTool,
    scrape_url: scrapeUrlTool,
    edit_video: editVideoTool,
    render_video: renderVideoTool,
    export_video: exportVideoTool,
    preview_video: previewVideoTool,
    poll_render_job: pollRenderJobTool,
    create_plan: createPlanTool,
    execute_plan: executePlanTool,
  }, source);
}
