import { useRef, useEffect, type ReactNode } from 'react';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  position?: 'bottom' | 'top';
  align?: 'left' | 'right';
  width?: string;
  maxHeight?: string;
  zIndex?: string;
}

export function Dropdown({
  isOpen,
  onClose,
  children,
  className = '',
  position = 'bottom',
  align = 'left',
  width = 'auto',
  maxHeight,
  zIndex = 'z-[9999]',
}: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = position === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1';
  const alignClasses = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div
      ref={ref}
      className={`absolute ${positionClasses} ${alignClasses} bg-card border border-border rounded-xl shadow-[0_0_0.5px_0_rgba(0,0,0,0.08)] ${zIndex} overflow-hidden transition-all duration-150 ease-out ${className}`}
      style={{ width, maxHeight }}
    >
      {maxHeight ? (
        <div className="overflow-y-auto thin-scrollbar" style={{ maxHeight }}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
