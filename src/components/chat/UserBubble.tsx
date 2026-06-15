import React from 'react';
import { CopyButton } from './CopyButton';

export const UserBubble = React.memo(({ content }: { content: string }) => (
  <div className="flex flex-col items-end mb-6 group w-full">
    <div className="bg-[#f9f9f9] rounded-[8px] px-4 py-2.5 text-sm max-w-[70%] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {content}
    </div>
    <div className="mr-3">
      <CopyButton content={content} alwaysVisible={false} />
    </div>
  </div>
));
