import { type FC, useState, useEffect, useRef, useMemo } from 'react';
import type { Command, FileNode } from './types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  onCommandSelect: (commandId: string) => void;
  files?: FileNode[];
  onFileSelect?: (path: string) => void;
}

const CommandPalette: FC<CommandPaletteProps> = ({ isOpen, onClose, commands, onCommandSelect, files, onFileSelect }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredCommands = useMemo(
    () => commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query]
  );

  const filteredFiles = useMemo(
    () => (files ?? []).filter(f => !f.isFolder && f.path.toLowerCase().includes(query.toLowerCase())),
    [files, query]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[9999] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="w-[min(600px,90vw)] bg-card rounded-[10px] shadow-2xl border border-border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 border-b border-border">
          <span className="text-muted-foreground mr-2">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent py-3 text-sm focus:outline-none"
            placeholder="Type to search..."
          />
        </div>
        {filteredCommands.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[11px] text-muted-foreground font-medium">Commands</div>
            {filteredCommands.map(cmd => (
              <div
                key={cmd.id}
                className="flex items-center justify-between px-4 py-2 text-sm hover:bg-muted cursor-pointer"
                onClick={() => { onCommandSelect(cmd.id); onClose(); }}
              >
                <span>{cmd.label}</span>
                {cmd.shortcut && <span className="text-[11px] text-muted-foreground">{cmd.shortcut}</span>}
              </div>
            ))}
          </div>
        )}
        {filteredFiles.length > 0 && (
          <div>
            <div className="px-4 py-1.5 text-[11px] text-muted-foreground font-medium">Files</div>
            {filteredFiles.map(file => (
              <div
                key={file.path}
                className="px-4 py-2 text-sm hover:bg-muted cursor-pointer"
                onClick={() => { onFileSelect?.(file.path); onClose(); }}
              >
                {file.path}
              </div>
            ))}
          </div>
        )}
        {filteredCommands.length === 0 && filteredFiles.length === 0 && query && (
          <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
export type { CommandPaletteProps };
