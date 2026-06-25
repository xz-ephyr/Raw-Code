import { useState, useRef, useEffect, useCallback } from 'react';
import { useSessionTitle } from '../../hooks/useSessionTitle';

export default function TitleBar() {
  const { title, setTitle, setUserEdited } = useSessionTitle();
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState(title);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setEditValue(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    setEditValue(title);
  }, [title]);

  const handleSubmitEdit = useCallback(async () => {
    const newTitle = editValue.trim() || title;
    setIsEditing(false);
    if (newTitle !== title) {
      setTitle(newTitle);
      setUserEdited(true);
    }
  }, [editValue, title, setTitle, setUserEdited]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  }, [title]);

  return (
    <div className="flex items-center h-9 px-3 bg-white border-b border-neutral-100 shrink-0 select-none">
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSubmitEdit}
          onKeyDown={handleKeyDown}
          className="w-full max-w-[400px] bg-neutral-50 border border-neutral-200 rounded px-2 py-0.5 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-300"
        />
      ) : (
        <button
          onClick={handleStartEdit}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-800 truncate max-w-[400px] cursor-text"
          title="Click to rename"
        >
          {title || 'xz'}
        </button>
      )}
    </div>
  );
}