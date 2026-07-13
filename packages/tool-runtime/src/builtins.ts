import { registerGlobalBatch, type GlobalRegistryEntry } from './registry/global';
import { writeArticleTool } from './content/write-article';
import { editTextTool } from './content/edit-text';
import { questionTool } from './content/question';
import { researchTool } from './content/research';
import { generateScriptTool } from './content/generate-script';
import { renderVideoTool } from './video/render-video';
import { exportVideoTool } from './video/export-video';
import { previewVideoTool } from './video/preview-video';

export function registerContentTools(source: GlobalRegistryEntry['source'] = 'content'): void {
  registerGlobalBatch({
    write_article: writeArticleTool,
    edit_text: editTextTool,
    question: questionTool,
    research: researchTool,
    generate_script: generateScriptTool,
    render_video: renderVideoTool,
    export_video: exportVideoTool,
    preview_video: previewVideoTool,
  }, source);
}
