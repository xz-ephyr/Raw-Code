import React from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import { ArtifactType } from '../../hooks/useArtifacts';

interface ArtifactRendererProps {
  type: ArtifactType;
  content: string;
}

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({ type, content }) => {
  switch (type) {
    case 'react':
      return (
        <Sandpack
          template="react"
          files={{
            '/App.js': content,
          }}
          options={{
            showNavigator: false,
            showTabs: false,
            editorHeight: '100%',
          }}
          theme="light"
        />
      );
    case 'html':
      return (
        <iframe
          srcDoc={content}
          className="w-full h-full border-none bg-white"
          title="Artifact Preview"
        />
      );
    case 'markdown':
      return (
        <div className="p-8 prose prose-sm max-w-none h-full overflow-auto bg-white">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      );
    case 'chart':
      // Simplified chart placeholder - in a real app we'd parse data and use Recharts
      return (
        <div className="flex items-center justify-center h-full bg-neutral-50 p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-600 mb-2">Chart View</p>
            <p className="text-xs text-neutral-400">Data visualization would render here.</p>
          </div>
        </div>
      );
    case 'sheet':
      return (
        <div className="h-full overflow-auto p-4 bg-white">
           <table className="min-w-full border-collapse border border-neutral-200 text-sm">
             <tbody>
                {content.split('\n').map((line, i) => (
                  <tr key={i}>
                    {line.split(',').map((cell, j) => (
                      <td key={j} className="border border-neutral-200 px-3 py-1.5">{cell}</td>
                    ))}
                  </tr>
                ))}
             </tbody>
           </table>
        </div>
      );
    case 'slides':
      return (
        <div className="flex items-center justify-center h-full bg-neutral-800 text-white p-8">
           <div className="text-center max-w-xl">
             <h2 className="text-3xl font-bold mb-4">Slide Preview</h2>
             <div className="bg-neutral-700 aspect-video flex items-center justify-center p-4 rounded-lg">
                <p className="text-lg">{content.split('\n')[0] || 'Slide Content'}</p>
             </div>
           </div>
        </div>
      );
    default:
      return (
        <div className="p-4 h-full overflow-auto bg-white">
          <pre className="text-xs">{content}</pre>
        </div>
      );
  }
};
