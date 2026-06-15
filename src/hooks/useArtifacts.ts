import { useState, useCallback } from 'react';

export type ArtifactType = 'react' | 'html' | 'markdown' | 'chart' | 'sheet' | 'slides';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  version: number;
}

export function useArtifacts() {
  const [artifacts, setArtifacts] = useState<Record<string, Artifact[]>>({});
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const addOrUpdateArtifact = useCallback((type: ArtifactType, title: string, content: string) => {
    const id = title.toLowerCase().replace(/\s+/g, '-');

    setArtifacts((prev) => {
      const versions = prev[id] || [];
      const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;

      if (latestVersion && latestVersion.content === content) {
        return prev;
      }

      const newVersion: Artifact = {
        id,
        type,
        title,
        content,
        version: versions.length + 1,
      };

      return {
        ...prev,
        [id]: [...versions, newVersion],
      };
    });

    setActiveArtifactId(id);
    setViewingVersion(null); // Reset to latest
    setIsOpen(true);
  }, []);

  const getArtifactVersions = useCallback((id: string) => {
    return artifacts[id] || [];
  }, [artifacts]);

  const getActiveArtifact = useCallback(() => {
    if (!activeArtifactId) return null;
    const versions = artifacts[activeArtifactId] || [];
    if (versions.length === 0) return null;

    if (viewingVersion !== null) {
      return versions.find(v => v.version === viewingVersion) || versions[versions.length - 1];
    }

    return versions[versions.length - 1];
  }, [activeArtifactId, artifacts, viewingVersion]);

  const closeArtifact = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    artifacts,
    activeArtifactId,
    setActiveArtifactId,
    viewingVersion,
    setViewingVersion,
    isOpen,
    setIsOpen,
    addOrUpdateArtifact,
    getArtifactVersions,
    getActiveArtifact,
    closeArtifact,
  };
}
