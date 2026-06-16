import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUp02Icon, PlusSignIcon, Idea01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { ThinScrollbar } from '../ui/ThinScrollbar';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  isIdle?: boolean;
  isThinkingEnabled: boolean;
  onToggleThinking: () => void;
}

export default function ChatInput({ onSend, isLoading, isIdle, isThinkingEnabled, onToggleThinking }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue('');
    }
  };

  const handleCreateProject = () => {
    onSend(
      "Let's create a new project structure! Please design a clean folder layout, a README.md, and starting configuration files for this project workspace."
    );
  };

  const handleCreatePlan = () => {
    onSend(
      'Please write a plan.md file listing our development milestones, checklists, and next steps. Make sure to update it as we proceed.'
    );
  };

  const handleCreateTodo = () => {
    onSend(
      'Please write a todo.md file listing the immediate tasks and actions we need to check off. Update it as we progress.'
    );
  };

  return (
    <div className="relative w-full max-w-[720px] mx-auto transition-all duration-300">
      {isIdle ? (
        /* ── IDLE STATE: Input sits inside a "shelf" holding box ── */
        <div className="relative">
          {/* Holding box — same radius as input, blends top/sides into page bg,
              only the bottom 28px strip shows as a distinct background */}
          <div
            className="absolute inset-x-0 top-0 rounded-[12px] bg-[#d1d2d6] border border-neutral-200/60 shadow-sm"
            style={{ bottom: '-28px' }}
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
                {/* Action Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-neutral-200/60 transition-colors text-neutral-600"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={18} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-50">
                      <button onClick={() => { handleCreateProject(); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700">Create Project</button>
                      <button onClick={() => { handleCreatePlan(); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700">Create Plan</button>
                      <button onClick={() => { handleCreateTodo(); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700">Create Todo</button>
                      <div className="border-t border-neutral-100 my-1"></div>
                      <button onClick={() => { onToggleThinking(); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 flex items-center justify-between">
                        <span className="flex items-center gap-2"><HugeiconsIcon icon={Idea01Icon} size={14} /> Thinking Mode</span>
                        {isThinkingEnabled && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                      </button>
                    </div>
                  )}
                </div>

                {/* Thinking Pill */}
                {isThinkingEnabled && (
                  <div
                    onClick={onToggleThinking}
                    className="group flex items-center gap-2 bg-blue-100 text-blue-900 px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center w-4 h-4">
                      <HugeiconsIcon icon={Idea01Icon} size={16} className="group-hover:hidden" />
                      <HugeiconsIcon icon={Cancel01Icon} size={16} className="hidden group-hover:block" />
                    </div>
                    Think
                  </div>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!value.trim() || isLoading}
                className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
              >
                <HugeiconsIcon
                  icon={ArrowUp02Icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </button>
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
                {/* Thinking Pill (in active state) */}
                {isThinkingEnabled && (
                  <div
                    onClick={onToggleThinking}
                    className="group flex items-center gap-1.5 bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-medium cursor-pointer"
                  >
                    <div className="relative flex items-center justify-center w-3.5 h-3.5">
                      <HugeiconsIcon icon={Idea01Icon} size={14} className="group-hover:hidden" />
                      <HugeiconsIcon icon={Cancel01Icon} size={14} className="hidden group-hover:block" />
                    </div>
                    Think
                  </div>
                )}
             </div>
             
             <button
                onClick={handleSend}
                disabled={!value.trim() || isLoading}
                className="p-1.5 text-white rounded-full bg-black disabled:opacity-50 transition-opacity hover:opacity-90 active:scale-95"
              >
                <HugeiconsIcon
                  icon={ArrowUp02Icon}
                  size={18}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </button>
          </div>
        </div>
      )}
    </div>
  );
}
