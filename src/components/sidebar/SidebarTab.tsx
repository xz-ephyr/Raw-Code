// Your rules resume
import { HugeIcon } from '../ui/HugeIcon';

interface SidebarTabProps {
  icon: any;
  label: string;
  active?: boolean;
}

export default function SidebarTab({ icon, label, active }: SidebarTabProps) {
  return (
    <div className={`flex items-center gap-3 p-2 rounded-[8px] cursor-pointer ${active ? 'bg-[#e5e5e5]' : 'hover:bg-[#f2f3f6]'}`}>
      <HugeIcon icon={icon} size={20} strokeWidth={1.5} />
      <span className="text-sm font-medium">{label}</span>
      {active && <div className="ml-auto w-1 h-[15px] bg-black rounded-[2px]" />}
    </div>
  );
}

