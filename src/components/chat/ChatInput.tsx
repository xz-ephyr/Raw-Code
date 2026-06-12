import { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { ThinScrollbar } from '../ui/ThinScrollbar';

export default function ChatInput() {
  const [value, setValue] = useState('');

  return (
    <div className="w-full max-w-[720px] mx-auto p-4">
      <div className="bg-white rounded-[12px] transition-all border-[1.5px] border-[#e5e5e5]">
        <ThinScrollbar className="max-h-[145px]">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask anything..."
            className="w-full p-4 resize-none outline-none text-sm min-h-[44px] bg-white"
            rows={1}
          />
        </ThinScrollbar>
        <div className="flex items-center justify-end px-3 py-2 bg-white">
          <button 
            disabled={!value.trim()}
            className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity"
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
