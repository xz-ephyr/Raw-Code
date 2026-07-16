import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export const CopyButton = ({
  content,
  alwaysVisible,
}: {
  content: string;
  alwaysVisible: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      console.warn('Failed to copy to clipboard');
    });
  };

  const label = copied ? 'Copied!' : 'Copy to clipboard';
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      aria-label={label}
      /*
       * Ensured visibility on mobile by removing opacity-0 for small screens,
       * while maintaining hover effect on larger viewports.
       */
      className={`${alwaysVisible ? '' : 'md:opacity-0 md:group-hover:opacity-100'} p-1 mt-1 text-foreground/70 hover:text-foreground transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm`}
      style={{ userSelect: 'none' }}
    >
      {copied ? (
          <Check size={14} className="text-green-600" />
        ) : (
          <Copy size={14} className="text-muted-foreground/60" />
      )}
    </button>
  );
};
