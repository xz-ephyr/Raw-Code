import { describe, it, expect } from 'vitest';
import { enforceExplorerPolicy, EXPLORER_ALLOWED, EXPLORER_BLOCKED } from '../core/prompt/explorerPolicy';

describe('Explorer Policy Enforcement', () => {
  it('should allow read tool', () => {
    const result = enforceExplorerPolicy('read');
    expect(result.allowed).toBe(true);
  });

  it('should allow grep tool', () => {
    const result = enforceExplorerPolicy('grep');
    expect(result.allowed).toBe(true);
  });

  it('should allow glob tool', () => {
    const result = enforceExplorerPolicy('glob');
    expect(result.allowed).toBe(true);
  });

  it('should allow write-to-plan tool', () => {
    const result = enforceExplorerPolicy('write-to-plan');
    expect(result.allowed).toBe(true);
  });

  it('should allow edit-plan tool', () => {
    const result = enforceExplorerPolicy('edit-plan');
    expect(result.allowed).toBe(true);
  });

  it('should allow write-plan tool', () => {
    const result = enforceExplorerPolicy('write-plan');
    expect(result.allowed).toBe(true);
  });

  it('should block edit tool', () => {
    const result = enforceExplorerPolicy('edit');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Explorer agent');
  });

  it('should block write tool', () => {
    const result = enforceExplorerPolicy('write');
    expect(result.allowed).toBe(false);
  });

  it('should block bash tool', () => {
    const result = enforceExplorerPolicy('bash');
    expect(result.allowed).toBe(false);
  });

  it('should block delete tool', () => {
    const result = enforceExplorerPolicy('delete');
    expect(result.allowed).toBe(false);
  });

  it('should block run tool', () => {
    const result = enforceExplorerPolicy('run');
    expect(result.allowed).toBe(false);
  });

  it('should block unknown tools not in either list', () => {
    const result = enforceExplorerPolicy('unknown_tool');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in Explorer');
  });

  it('should have correct ALLOWED list', () => {
    expect(EXPLORER_ALLOWED).toEqual(
      expect.arrayContaining(['read', 'grep', 'glob', 'write-to-plan', 'edit-plan', 'write-plan'])
    );
  });

  it('should have correct BLOCKED list', () => {
    expect(EXPLORER_BLOCKED).toEqual(
      expect.arrayContaining(['edit', 'write', 'bash', 'delete', 'run'])
    );
  });
});
