interface SidebarTabProps {
  label: string;
  active?: boolean;
  collapsed?: boolean;
}

export default function SidebarTab({ label, active, collapsed }: SidebarTabProps) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} p-2 rounded-[8px] cursor-pointer ${active ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'} active:scale-95 transition-transform`}>
      <span className="text-sm font-medium whitespace-nowrap">{label}</span>
      {active && !collapsed && <div className="ml-auto w-1 h-[15px] bg-black rounded-[2px]" />}
    </div>
  );
}

