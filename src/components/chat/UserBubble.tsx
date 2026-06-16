import React, { useState, useRef, useEffect } from 'react';
import { CopyButton } from './CopyButton';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

export const UserBubble = React.memo(({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowToggle, setShouldShowToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Check if the content height exceeds 55px
      if (contentRef.current.scrollHeight > 55) {
        setShouldShowToggle(true);
      } else {
        setShouldShowToggle(false);
      }
    }
  }, [content]);

  return (
    <div className="flex flex-col items-end mb-6 group w-full">
      <div 
        className="relative bg-[#f9f9f9] rounded-[8px] border border-neutral-200/50 text-base max-w-[calc(100%-55px)] transition-all duration-300 ease-in-out"
      >
        <div
          ref={contentRef}
          className={`px-4 py-2.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere] transition-all duration-300 ease-in-out ${
            shouldShowToggle && !isExpanded ? 'max-h-[55px] overflow-hidden pb-6' : ''
          }`}
        >
          {content}
          
          {/* Fade-out overlay at the bottom when collapsed */}
          {shouldShowToggle && !isExpanded && (
            <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[#f9f9f9] to-transparent pointer-events-none" />
          )}
        </div>

        {/* Chevron toggle button */}
        {shouldShowToggle && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute bottom-1 right-2 p-1 rounded-full bg-neutral-200/60 hover:bg-neutral-200 text-neutral-600 hover:text-black transition-all flex items-center justify-center z-10 shadow-sm"
            title={isExpanded ? 'Show less' : 'Show more'}
          >
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={12}
              className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      <div className="mr-3">
        <CopyButton content={content} alwaysVisible={false} />
      </div>
    </div>
  );
});
