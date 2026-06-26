import { useState, useCallback, useRef } from 'react';
import type { Artifact, ArtifactVersion } from '../types/artifact';

export function useArtifacts() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const versionCounterRef = useRef<Record<string, number>>({});

  const processedIdentifiersRef = useRef<Set<string>>(new Set());

  const addArtifacts = useCallback((newArtifacts: Artifact[]) => {
    const deduped = newArtifacts.filter(
      (a) => !processedIdentifiersRef.current.has(a.identifier)
    );

    if (deduped.length === 0) return;

    setArtifacts((prev) => {
      const updated = [...prev];

      for (const incoming of deduped) {
        processedIdentifiersRef.current.add(incoming.identifier);

        const existingIndex = updated.findIndex(
          (a) => a.identifier === incoming.identifier
        );

        if (existingIndex >= 0) {
          const existing = updated[existingIndex];
          const nextVersion = (versionCounterRef.current[incoming.identifier] ?? existing.version) + 1;
          versionCounterRef.current[incoming.identifier] = nextVersion;

          const oldVersion: ArtifactVersion = {
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
          versionCounterRef.current[incoming.identifier] = 0;
          updated.push({
            ...incoming,
            version: 0,
            createdAt: Date.now(),
            versions: [],
          });
        }
      }

      return updated;
    });

    if (deduped.length > 0) {
      setActiveArtifactId(deduped[0].identifier);
      setIsPanelOpen(true);
    }
  }, []);

  const rollbackArtifact = useCallback((identifier: string, targetVersion: number) => {
    setArtifacts((prev) => {
      const idx = prev.findIndex((a) => a.identifier === identifier);
      if (idx < 0) return prev;

      const artifact = prev[idx];
      const versionEntry = (artifact.versions || []).find(
        (v) => v.version === targetVersion
      );
      if (!versionEntry) return prev;

      const currentVersion: ArtifactVersion = {
        content: artifact.content,
        version: artifact.version,
        createdAt: artifact.createdAt,
      };

      const updated = [...prev];
      updated[idx] = {
        ...artifact,
        content: versionEntry.content,
        version: versionEntry.version,
        createdAt: Date.now(),
        versions: [
          ...(artifact.versions || []).filter((v) => v.version !== targetVersion),
          currentVersion,
        ],
      };

      return updated;
    });
  }, []);

  const selectArtifact = useCallback((id: string) => {
    setActiveArtifactId(id);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  const clearArtifacts = useCallback(() => {
    setArtifacts([]);
    setActiveArtifactId(null);
    setIsPanelOpen(false);
    versionCounterRef.current = {};
  }, []);

  return {
    artifacts,
    activeArtifactId,
    isPanelOpen,
    addArtifacts,
    rollbackArtifact,
    selectArtifact,
    closePanel,
    openPanel,
    clearArtifacts,
  };
}
