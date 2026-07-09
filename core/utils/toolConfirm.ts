export interface PendingConfirmation {
  tool: string;
  description: string;
  params: Record<string, any>;
}

let resolveConfirm: ((value: any) => void) | null = null;
let currentPending: PendingConfirmation | null = null;

export function requestToolConfirmation(
  tool: string,
  description: string,
  params: Record<string, any>
): Promise<any> {
  return new Promise((resolve) => {
    currentPending = { tool, description, params };
    resolveConfirm = resolve;
    window.dispatchEvent(new CustomEvent('tool-confirm-request', { detail: currentPending }));
  });
}

export function approveToolConfirmation(result?: any) {
  if (resolveConfirm) {
    resolveConfirm(result ?? { approved: true });
  }
  currentPending = null;
  resolveConfirm = null;
}

export function denyToolConfirmation(message?: string) {
  if (resolveConfirm) {
    resolveConfirm({ denied: true, message: message ?? 'User denied this action' });
  }
  currentPending = null;
  resolveConfirm = null;
}
