import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, PlusSignIcon, Idea01Icon, Cancel01Icon, StopIcon, Attachment01Icon, CameraAdd01Icon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';
import ModelList from './ModelList';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  isIdle?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
  currentModel?: string;
}

function ToolbarDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = [
    { icon: Attachment01Icon, label: 'Add file or photos', title: 'Upload file or photos' },
    { icon: CameraAdd01Icon, label: 'Take a Screenshots', title: 'Take a screenshot' },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-200/60 transition-colors text-black"
        aria-label="Add content"
        title="Add content"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={18} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full mb-1 left-0 w-[213px] bg-white border border-neutral-200 rounded-xl shadow-xl z-[9999] overflow-hidden">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 rounded-md"
              title={item.title}
            >
              <HugeiconsIcon icon={item.icon} size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ThinkingPill({
  onToggleThinking,
  size = 'normal',
}: {
  onToggleThinking: () => void;
  size?: 'normal' | 'small';
}) {
  return (
    <button
      type="button"
      onClick={onToggleThinking}
      className={`group flex items-center gap-2 bg-blue-100 text-blue-900 ${size === 'normal' ? 'px-4 py-1.5 text-sm' : 'px-3 py-1 text-xs'} rounded-full font-medium cursor-pointer transition-all active:scale-95`}
      aria-label="Disable thinking mode"
      title="Disable thinking mode"
    >
      <div className={`relative flex items-center justify-center ${size === 'normal' ? 'w-4 h-4' : 'w-3.5 h-3.5'}`}>
        <HugeiconsIcon icon={Idea01Icon} size={size === 'normal' ? 16 : 14} className="group-hover:hidden" />
        <HugeiconsIcon icon={Cancel01Icon} size={size === 'normal' ? 16 : 14} className="hidden group-hover:block" />
      </div>
      Think
    </button>
  );
}

function SendButton({
  isLoading,
  onStop,
  onSend,
  hasValue,
}: {
  isLoading?: boolean;
  onStop?: () => void;
  onSend: () => void;
  hasValue: boolean;
}) {
  const label = isLoading ? 'Stop generation' : 'Send message';
  return (
    <button
      type="button"
      onClick={isLoading ? onStop : onSend}
      disabled={!hasValue && !isLoading}
      className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
      aria-label={label}
      title={label}
    >
      <HugeiconsIcon
        icon={isLoading ? StopIcon : ArrowUp02Icon}
        size={18}
        color="currentColor"
        strokeWidth={1.5}
      />
    </button>
  );
}

export default function ChatInput({ onSend, onStop, isLoading, isThinkingEnabled, onToggleThinking, currentModel }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue('');
    }
  };

  const commonTextareaProps = {
    ref: textareaRef,
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value),
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    placeholder: isLoading ? 'Generating...' : 'Ask anything...',
    disabled: isLoading,
  };

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: 'min(880px, 100%)' }}>
      <div className="bg-white/70 rounded-[12px] relative z-10 border border-neutral-200/60 shadow-sm">
        <ThinScrollbar className="max-h-[145px]">
          <textarea
            {...commonTextareaProps}
            className="w-full py-3 px-4 resize-none outline-none text-[15px] min-h-[48px] bg-transparent overflow-hidden"
            rows={1}
          />
        </ThinScrollbar>

        <div className="flex flex-col px-3 py-1.5 bg-transparent gap-1">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <ToolbarDropdown />
            </div>
            <div className="flex items-center gap-1">
              {currentModel && <ModelList currentModel={currentModel} />}
              <SendButton isLoading={isLoading} onStop={onStop} onSend={handleSend} hasValue={!!value.trim()} />
            </div>
          </div>
          {isThinkingEnabled && (
            <div className="flex justify-end">
              <ThinkingPill onToggleThinking={onToggleThinking} size="small" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
