import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface SidebarTabProps {
  iconElement: ReactNode;
  label: string;
  path?: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const SidebarTab = React.memo(
  ({ iconElement, label, path, active, collapsed, onClick }: SidebarTabProps) => {
    const content = (
      <>
        <div className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
          {iconElement}
        </div>
        <span
          className={cn(
            'text-sm font-medium whitespace-nowrap transition-all duration-200 overflow-hidden',
            collapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[200px] opacity-100'
          )}
        >
          {label}
        </span>
      </>
    );

    const className = cn(
      'flex items-center px-3 py-1 rounded-[8px] cursor-pointer active:scale-[0.99] transition-transform w-full',
      collapsed ? 'justify-center' : 'gap-3',
      active ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
    );

    if (path) {
      return collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={path} onClick={onClick} className={className}>
              {content}
            </Link>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ) : (
        <Link to={path} onClick={onClick} className={className}>
          {content}
        </Link>
      );
    }

    return collapsed ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onClick} className={className}>
            {content}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    ) : (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
);

export default SidebarTab;
