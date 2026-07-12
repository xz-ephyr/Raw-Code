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
        <div className="absolute left-3 top-2.5 text-muted-foreground">
          <HugeiconsIcon icon={Key01Icon} size={13} />
        </div>
      )}
      <input
        type={visible ? 'text' : 'password'}
        className={`h-9 bg-muted rounded-lg outline-none text-sm w-full border border-border focus:border-ring transition-colors ${showKeyIcon ? 'pl-8 pr-9' : 'pl-3 pr-9'}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-0.5"
      >
        <HugeiconsIcon icon={visible ? ViewOffSlashIcon : ViewIcon} size={15} />
      </button>
    </div>
  );
}
