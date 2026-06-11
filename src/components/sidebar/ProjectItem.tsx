// Your rules resume
import { Folder01Icon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '../ui/HugeIcon';

interface ProjectItemProps {
  name: string;
}

export default function ProjectItem({ name }: ProjectItemProps) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 p-2 hover:bg-[#f2f3f6] rounded-[8px] cursor-pointer">
        <HugeIcon icon={Folder01Icon} size={20} />
        <span className="text-sm font-semibold text-gray-700">{name}</span>
      </div>
      <div className="ml-6 mt-1 space-y-1">
        <div className="text-sm p-1 hover:bg-[#f2f3f6] rounded-[8px] flex justify-between group text-gray-600">
          Chat Session 1
          <button className="hidden group-hover:block">...</button>
        </div>
      </div>
    </div>
  );
}
