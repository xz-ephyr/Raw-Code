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

  return (
    <button
      onClick={handleCopy}
      className={`${alwaysVisible ? '' : 'opacity-0 group-hover:opacity-100'} p-1 mt-1 text-gray-600 hover:text-black transition-opacity`}
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
