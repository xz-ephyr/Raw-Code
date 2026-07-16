import { registerGlobalBatch, type GlobalRegistryEntry } from './registry/global';
import { writeArticleTool } from './content/write-article';
import { editTextTool } from './content/edit-text';
import { questionTool } from './content/question';
import { researchTool } from './content/research';
import { generateScriptTool } from './content/generate-script';
import { crawlWebsiteTool } from './content/crawl-website';
import { mapSiteTool } from './content/map-site';
import { extractVideosTool } from './content/extract-videos';
import { scrapeUrlTool } from './content/scrape-url';
import { extractImagesTool } from './content/extract-images';
import { extractStructuredTool } from './content/extract-structured';
import { researchCompileTool } from './content/research-compile';
import { crawlToArticlesTool } from './content/crawl-to-articles';
import { importVideoSourcesTool } from './content/import-video-sources';
import { renderVideoTool } from './video/render-video';
import { editVideoTool } from './video/edit-video';
import { exportVideoTool } from './video/export-video';
import { previewVideoTool } from './video/preview-video';
import { pollRenderJobTool } from './video/poll-render-job';
import { createPlanTool } from './plan/create-plan';
import { executePlanTool } from './plan/execute-plan';
import { planTemplatesTool } from './plan/plan-templates';

export function registerContentTools(source: GlobalRegistryEntry['source'] = 'content'): void {
  registerGlobalBatch({
    write_article: writeArticleTool,
    edit_text: editTextTool,
    question: questionTool,
    research: researchTool,
    generate_script: generateScriptTool,
    crawl_website: crawlWebsiteTool,
    map_site: mapSiteTool,
    extract_videos: extractVideosTool,
    scrape_url: scrapeUrlTool,
    extract_images: extractImagesTool,
    extract_structured: extractStructuredTool,
    research_compile: researchCompileTool,
    crawl_to_articles: crawlToArticlesTool,
    import_video_sources: importVideoSourcesTool,
    edit_video: editVideoTool,
    render_video: renderVideoTool,
    export_video: exportVideoTool,
    preview_video: previewVideoTool,
    poll_render_job: pollRenderJobTool,
    create_plan: createPlanTool,
    execute_plan: executePlanTool,
    plan_templates: planTemplatesTool,
  }, source);
}
