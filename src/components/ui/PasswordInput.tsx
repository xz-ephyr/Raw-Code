import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffSlashIcon, Key01Icon } from '@hugeicons/core-free-icons';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showKeyIcon?: boolean;
}

export function PasswordInput({ value, onChange, placeholder, showKeyIcon = false }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {showKeyIcon && (
        <div className="absolute left-3 top-2.5 text-neutral-400">
          <HugeiconsIcon icon={Key01Icon} size={13} />
        </div>
      )}
      <input
        type={visible ? 'text' : 'password'}
        className={`h-9 bg-neutral-800 rounded-[8px] outline-none text-sm w-full border border-neutral-700 focus:border-neutral-500 transition-colors ${showKeyIcon ? 'pl-8 pr-9' : 'pl-3 pr-9'}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-300 p-0.5"
      >
        <HugeiconsIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={15} />
      </button>
    </div>
  );
}
