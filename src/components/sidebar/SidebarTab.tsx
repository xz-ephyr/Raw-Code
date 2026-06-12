import React, { type ElementType } from 'react';
import { Link } from 'react-router-dom';

interface SidebarTabProps {
  icon: ElementType;
  label: string;
  path: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const SidebarTab = React.memo(({ icon: Icon, label, path, active, collapsed, onClick }: SidebarTabProps) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Link to={path} onClick={handleClick} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-[8px] cursor-pointer ${active ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'} active:scale-[0.99] transition-transform`}>
      <div className="shrink-0">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{label}</span>}
      {active && !collapsed && <div className="ml-auto w-1 h-[15px] bg-black rounded-[2px]" />}
    </Link>
  );
});

export default SidebarTab;

