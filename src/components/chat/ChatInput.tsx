import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue('');
    }
  };

  return (
    <div className="w-full max-w-[720px] mx-auto">
      <div className="bg-[#f2f3f6] rounded-[12px] transition-all">
        <ThinScrollbar className="max-h-[145px]">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isLoading ? "Generating..." : "Ask anything..."}
            className="w-full py-3 px-4 resize-none outline-none text-sm min-h-[44px] bg-transparent"
            rows={1}
            disabled={isLoading}
          />
        </ThinScrollbar>
        <div className="flex items-center justify-end px-3 py-2 bg-transparent">
          <div className="flex-1" /> {/* Spacer to push button to right */}
          <button 
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity"
          >
            <HugeiconsIcon icon={ArrowUp02Icon} size={18} color="currentColor" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
