import type { FC } from 'react';

interface StatusBarProps {
  language?: string;
  cursorLine?: number;
  cursorColumn?: number;
  fileName?: string;
  isDirty?: boolean;
  tabCount?: number;
}

const StatusBar: FC<StatusBarProps> = ({ language, cursorLine, cursorColumn, tabCount }) => {
  return (
    <div className="flex flex-row items-center justify-between h-6 py-1 px-4 bg-muted text-[11px] text-muted-foreground shrink-0">
      <span>{language ?? 'Plain Text'}</span>
      <span>Ln {cursorLine ?? 1}, Col {cursorColumn ?? 1}</span>
      <span>{tabCount ?? 0} tabs</span>
    </div>
  );
};

export default StatusBar;
export type { StatusBarProps };
