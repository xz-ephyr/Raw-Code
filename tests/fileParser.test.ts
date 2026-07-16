import { describe, it, expect } from 'vitest';
import { parseFiles, canPreviewType } from '../src/lib/fileParser';

describe('resolveType (via parseFiles)', () => {
  it('resolves short name "pdf"', () => {
    const result = parseFiles('<antArtifact type="pdf" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('pdf');
  });

  it('resolves short name "doc"', () => {
    const result = parseFiles('<antArtifact type="doc" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('doc');
  });

  it('resolves short name "pptx"', () => {
    const result = parseFiles('<antArtifact type="pptx" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('pptx');
  });

  it('resolves short name "excel"', () => {
    const result = parseFiles('<antArtifact type="excel" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('excel');
  });

  it('resolves short name "markdown"', () => {
    const result = parseFiles('<antArtifact type="markdown" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('markdown');
  });

  it('resolves MIME type "application/pdf"', () => {
    const result = parseFiles('<antArtifact type="application/pdf" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('pdf');
  });

  it('resolves MIME type "text/markdown"', () => {
    const result = parseFiles('<antArtifact type="text/markdown" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('markdown');
  });

  it('falls back to markdown for unknown type', () => {
    const result = parseFiles('<antArtifact type="unknown/foo" title="test">content</antArtifact>');
    expect(result.files[0].type).toBe('markdown');
  });

  it('handles write_artifact tag', () => {
    const result = parseFiles('<write_artifact type="pdf" title="test">content</write_artifact>');
    expect(result.files[0].type).toBe('pdf');
  });

  it('extracts content correctly', () => {
    const result = parseFiles('<antArtifact type="pdf" title="My PDF">Hello World</antArtifact>');
    expect(result.files[0].content).toBe('Hello World');
    expect(result.files[0].title).toBe('My PDF');
  });

  it('strips artifact tags from cleanText', () => {
    const result = parseFiles('before<antArtifact type="pdf">inside</antArtifact>after');
    expect(result.cleanText).toBe('beforeafter');
  });
});

describe('canPreviewType', () => {
  it('returns true for pdf', () => {
    expect(canPreviewType('pdf')).toBe(true);
  });

  it('returns true for markdown', () => {
    expect(canPreviewType('markdown')).toBe(true);
  });

  it('returns false for unknown type', () => {
    expect(canPreviewType('doc' as any)).toBe(false);
  });
});
