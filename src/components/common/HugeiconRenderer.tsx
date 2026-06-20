import { HugeiconsIcon } from '@hugeicons/react';
export const HugeiconRenderer = ({ icon: Icon, size = 18, className = '', color = 'currentColor', strokeWidth = 1.5 }: any) => (
  <HugeiconsIcon icon={Icon} size={size} color={color} strokeWidth={strokeWidth} className={className} />
);
