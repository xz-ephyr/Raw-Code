import { DatabaseService } from '../services/DatabaseService';
import { mapUIMessageToLegacyMessage } from '../utils/chatUtils';
import { resolveProjectPath } from '../lib/projectPaths';
import { FileSystemService } from '../services/FileSystemService';
export const useChatHandlers = (uuid: any, project: any, addOrUpdateArtifact: any, loadProjectContext: any) => {
  const handleChatFinish = async (event: any) => {
    if (uuid && uuid !== 'new') await DatabaseService.saveMessages(uuid, [event.message]);
    const message = mapUIMessageToLegacyMessage(event.message);
    if (!message.toolInvocations) return;
    for (const ti of message.toolInvocations) {
      if (ti.state !== 'result' || ti.result?.error) continue;
      if (ti.toolName === 'create_artifact') {
        const { type = 'markdown', title = 'Untitled Artifact', content = '', file_path } = ti.args || {};
        addOrUpdateArtifact(type, title, content);
        if (project && file_path) {
          try {
            const fullPath = await resolveProjectPath(project.path, file_path);
            if (fullPath) { await FileSystemService.saveFile(fullPath, content); await loadProjectContext(project.path); }
          } catch (e) { console.error(e); }
        }
      } else if (['write_file', 'edit_file'].includes(ti.toolName)) {
        const file_path = ti.args.file_path;
        const content = ti.result.content || ti.args.content;
        if (content) {
          const ext = file_path.split('.').pop() || '';
          const type = ['ts', 'tsx', 'js', 'jsx'].includes(ext) ? 'react' : ['html'].includes(ext) ? 'html' : 'markdown';
          addOrUpdateArtifact(type, file_path, content);
        }
        if (project) await loadProjectContext(project.path);
      } else if (ti.toolName === 'write_to_plan') {
        addOrUpdateArtifact('markdown', ti.args.filename, ti.args.content);
        if (project) await loadProjectContext(project.path);
      }
    }
  };
  return { handleChatFinish };
};
