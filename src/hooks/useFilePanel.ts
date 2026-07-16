import { useState, useCallback } from 'react';
import type { FileItem, FileVersion } from '../types/file-panel';

export function useFilePanel() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const addFiles = useCallback((newFiles: FileItem[]) => {
    setFiles((prev) => {
      const updated = [...prev];
      let addedCount = 0;
      let firstAddedId: string | null = null;

      for (const incoming of newFiles) {
        const existingIndex = updated.findIndex(
          (a) => a.identifier === incoming.identifier
        );

        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          if ((incoming.version ?? 0) <= (existing.version ?? 0) && incoming.content === existing.content) {
            continue;
          }

          const nextVersion = existing.version + 1;
          const oldVersion: FileVersion = {
            content: existing.content,
            version: existing.version,
            createdAt: existing.createdAt,
          };

          updated[existingIndex] = {
            ...incoming,
            version: nextVersion,
            createdAt: Date.now(),
            versions: [...(existing.versions || []), oldVersion],
          };
        } else {
          const fileVersion = incoming.version ?? 0;
          updated.push({
            ...incoming,
            version: fileVersion,
            createdAt: Date.now(),
            versions: [],
          });
        }

        if (addedCount === 0) {
          firstAddedId = incoming.identifier;
        }
        addedCount++;
      }

      if (addedCount > 0) {
        setActiveFileId(firstAddedId!);
        setIsPanelOpen(true);
      }

      return updated;
    });
  }, []);

  const rollbackFile = useCallback((identifier: string, targetVersion: number) => {
    setFiles((prev) => {
      const idx = prev.findIndex((a) => a.identifier === identifier);
      if (idx < 0) return prev;

      const file = prev[idx];
      const versionEntry = (file.versions || []).find(
        (v) => v.version === targetVersion
      );
      if (!versionEntry) return prev;

      const currentVersion: FileVersion = {
        content: file.content,
        version: file.version,
        createdAt: file.createdAt,
      };

      const updated = [...prev];
      updated[idx] = {
        ...file,
        content: versionEntry.content,
        version: versionEntry.version,
        createdAt: Date.now(),
        versions: [
          ...(file.versions || []).filter((v) => v.version !== targetVersion),
          currentVersion,
        ],
      };

      return updated;
    });
  }, []);

  const selectFile = useCallback((id: string) => {
    setActiveFileId(id);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setActiveFileId(null);
    setIsPanelOpen(false);
  }, []);

  return {
    files,
    activeFileId,
    isPanelOpen,
    addFiles,
    rollbackFile,
    selectFile,
    closePanel,
    openPanel,
    clearFiles,
  };
}
