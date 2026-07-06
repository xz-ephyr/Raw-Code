import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { TerminalService } from '@/services/TerminalService';
import { isTauri } from '@/lib/tauri';
import { HugeiconRenderer } from '../ui/HugeiconRenderer';
import { Delete02Icon } from '@hugeicons/core-free-icons';

interface TerminalPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function TerminalPanel({ visible, onClose }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const spawnedRef = useRef(false);

  const spawnSession = useCallback(async (term: Terminal) => {
    if (!isTauri() || spawnedRef.current) return;
    spawnedRef.current = true;

    const cols = term.cols;
    const rows = term.rows;

    await TerminalService.spawn(cols, rows, {
      onOutput: (data) => {
        term.write(data);
      },
      onExit: () => {
        term.write('\r\n\x1b[31m[Process exited]\x1b[0m\r\n');
        spawnedRef.current = false;
      },
    });
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: '#0d1117',
        foreground: '#e6edf3',
        cursor: '#e6edf3',
        selectionBackground: '#3b5998',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    term.open(containerRef.current);
    term.focus();

    terminalRef.current = term;

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch { /* ignore */ }
    });
    resizeObserver.observe(containerRef.current);

    term.onData((data) => {
      TerminalService.write(data);
    });

    term.onResize(({ cols, rows }) => {
      TerminalService.resize(cols, rows);
    });

    spawnSession(term);

    return () => {
      resizeObserver.disconnect();
      TerminalService.kill();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      spawnedRef.current = false;
    };
  }, [visible, spawnSession]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      try {
        fitAddonRef.current?.fit();
      } catch { /* ignore */ }
    }, 50);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="h-[200px] shrink-0 bg-[#0d1117] border-t border-border flex flex-col">
      <div className="flex items-center justify-between px-3 py-1 shrink-0 bg-[#161b22] border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">Terminal</span>
        <button
          type="button"
          onClick={onClose}
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close terminal"
        >
          <HugeiconRenderer icon={Delete02Icon} size={12} />
        </button>
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
