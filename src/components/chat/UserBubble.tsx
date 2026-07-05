import React from 'react';
import { CopyButton } from './CopyButton';

export const UserBubble = React.memo(({ content }: { content: string }) => {
  return (
    <div className="flex flex-col items-end mb-2 group w-full">
      <div className="relative bg-muted rounded-[12px] text-[15px] max-w-[85%] text-white">
        <div className="px-5 py-3 whitespace-pre-wrap break-words leading-relaxed">
          {content}
        </div>
      </div>
      <div className="mr-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton content={content} alwaysVisible={false} />
      </div>
    </div>
  );
});
