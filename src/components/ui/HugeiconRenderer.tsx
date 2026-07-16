import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';

interface HugeiconRendererProps {
  icon: any;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

/**
 * HugeiconRenderer
 *
 * A centralized icon renderer that uses React.memo to prevent unnecessary re-renders.
 * Standardizing icon rendering across the app improves performance and maintainability.
 */
export const HugeiconRenderer = React.memo(
  ({
    icon: Icon,
    size = 18,
    className = '',
    color = 'currentColor',
    strokeWidth = 1.5,
  }: HugeiconRendererProps) => {
    if (!Array.isArray(Icon)) return null;
    return (
      <HugeiconsIcon
        icon={Icon}
        size={size}
        color={color}
        strokeWidth={strokeWidth}
        className={className}
      />
    );
  }
);
