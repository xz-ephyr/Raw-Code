import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { rust } from '@codemirror/lang-rust';
import { File01Icon } from '@hugeicons/core-free-icons';
import { HugeiconRenderer } from '@/components/ui/HugeiconRenderer';
import type { Tab } from './types';
import { EditorTab } from './EditorTab';

interface EditorProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onContentChange: (tabId: string, content: string) => void;
}

function getLanguageExtension(language: string) {
  switch (language) {
    case 'javascript':
    case 'typescript':
      return javascript({ jsx: true, typescript: language === 'typescript' });
    case 'html':
      return html();
    case 'css':
      return css();
    case 'json':
      return json();
    case 'markdown':
      return markdown();
    case 'python':
      return python();
    case 'rust':
      return rust();
    default:
      return undefined;
  }
}

export function Editor({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onContentChange,
}: EditorProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleChange = (value: string) => {
    if (activeTabId) {
      onContentChange(activeTabId, value);
    }
  };

  if (!activeTab) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground select-none">
        <HugeiconRenderer icon={File01Icon} size={56} className="mb-4 opacity-30" />
        <p className="text-base font-semibold mb-1">No file open</p>
        <p className="text-sm text-muted-foreground/70">Open a file from the explorer or create a new one</p>
      </div>
    );
  }

  const extension = getLanguageExtension(activeTab.language);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center overflow-x-auto no-wrap border-b border-border">
        {tabs.map((tab) => (
          <EditorTab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => onTabSelect(tab.id)}
            onClose={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
          />
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={activeTab.content}
          extensions={extension ? [extension] : []}
          onChange={handleChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
          }}
          className="h-full [&_.cm-editor]:h-full [&_.cm-scroller]:h-full [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm"
        />
      </div>
    </div>
  );
}
