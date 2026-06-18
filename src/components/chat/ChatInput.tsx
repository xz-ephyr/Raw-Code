import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, PlusSignIcon, Idea01Icon, Cancel01Icon, StopIcon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isIdle?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
}

export default function ChatInput({ onSend, onStop, isLoading, isIdle, isThinkingEnabled, onToggleThinking }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue('');
    }
  };

  const PlusDropdown = ({ dropUp = false }: { dropUp?: boolean }) => (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-200/60 transition-colors text-black"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={18} />
      </button>

      {isDropdownOpen && (
        <div
          className={`absolute ${dropUp ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50`}
        >
          <button
            onClick={() => { onToggleThinking(); setIsDropdownOpen(false); }}
            className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 flex items-center justify-between"
          >
            <span className="flex items-center gap-2"><HugeiconsIcon icon={Idea01Icon} size={14} /> Thinking Mode</span>
            {isThinkingEnabled && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
          </button>
        </div>
      )}
    </div>
  );

  const ThinkingPill = ({ size = 'normal' }: { size?: 'normal' | 'small' }) => (
    <div
      onClick={onToggleThinking}
      className={`group flex items-center gap-2 bg-blue-100 text-blue-900 ${size === 'normal' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'} rounded-full font-medium cursor-pointer transition-all active:scale-95`}
    >
      <div className={`relative flex items-center justify-center ${size === 'normal' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`}>
        <HugeiconsIcon icon={Idea01Icon} size={size === 'normal' ? 16 : 14} className="group-hover:hidden" />
        <HugeiconsIcon icon={Cancel01Icon} size={size === 'normal' ? 16 : 14} className="hidden group-hover:block" />
      </div>
      Think
    </div>
  );

  const SendButton = () => (
    <button
      onClick={isLoading ? onStop : handleSend}
      disabled={!value.trim() && !isLoading}
      className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
    >
      <HugeiconsIcon
        icon={isLoading ? StopIcon : ArrowUp02Icon}
        size={18}
        color="currentColor"
        strokeWidth={1.5}
      />
    </button>
  );

  return (
    <div className="relative w-full max-w-[720px] mx-auto transition-all duration-300">
      {isIdle ? (
        /* ── IDLE STATE: Input sits inside a "shelf" holding box ── */
        <div className="relative">
          {/* Holding box — same radius as input, blends top/sides into page bg,
              only the bottom strip shows as a distinct background.
              Increased height from 28px to 43px (28 + 15). */}
          <div
            className="absolute inset-x-0 top-0 rounded-[12px] bg-[#d1d2d6] border border-neutral-200/60 shadow-sm"
            style={{ bottom: '-43px' }}
            aria-hidden="true"
          />

          {/* Inner Input Box — sits on top of the holding box */}
          <div className="bg-[#fafafa] rounded-[12px] transition-all relative z-10 border border-neutral-200/60">
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
                placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
                className="w-full py-3 px-4 resize-none outline-none text-base min-h-[44px] bg-transparent"
                rows={1}
                disabled={isLoading}
              />
            </ThinScrollbar>
            
            <div className="flex items-center justify-between px-3 py-2 bg-transparent">
              <div className="flex items-center gap-2">
                <PlusDropdown dropUp={false} />
                {isThinkingEnabled && <ThinkingPill />}
              </div>
              <SendButton />
            </div>
          </div>
        </div>
      ) : (
        /* ── ACTIVE STATE: Plain input, no shelf ── */
        <div className="bg-[#f2f3f6] rounded-[12px] transition-all relative z-10 border border-neutral-200/60 shadow-sm">
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
              placeholder={isLoading ? 'Generating...' : 'Ask anything...'}
              className="w-full py-3 px-4 resize-none outline-none text-sm min-h-[44px] bg-transparent"
              rows={1}
              disabled={isLoading}
            />
          </ThinScrollbar>
          
          <div className="flex items-center justify-between px-3 py-2 bg-transparent">
             <div className="flex items-center gap-2">
                <PlusDropdown dropUp={true} />
                {isThinkingEnabled && <ThinkingPill size="small" />}
             </div>
             <SendButton />
          </div>
        </div>
      )}
    </div>
  );
}
