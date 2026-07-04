import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

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
      className={`${alwaysVisible ? '' : 'md:opacity-0 md:group-hover:opacity-100'} p-1 mt-1 text-neutral-400 hover:text-white transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm`}
    >
      {copied ? (
        <HugeiconsIcon
          icon={Tick01Icon}
          size={18}
          color="currentColor"
          strokeWidth={1.5}
          className="text-green-600"
        />
      ) : (
        <HugeiconsIcon icon={Copy01Icon} size={18} color="currentColor" strokeWidth={1.5} />
      )}
    </button>
  );
};
