import { useState, useEffect, useCallback } from 'react';
import { approveToolConfirmation, denyToolConfirmation } from '@core/utils/toolConfirm';
import { onEvent, resolveDeferred } from '@doktor/tool-runtime';

export function usePendingConfirm() {
  const [pendingConfirm, setPendingConfirm] = useState<{ tool: string; description: string } | null>(null);

  const [pendingQuestion, setPendingQuestion] = useState<{
    toolCallID: string;
    question: string;
    options: string[] | null;
    allowCustom: boolean;
    sessionID: string;
  } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setPendingConfirm(detail ? { tool: detail.tool, description: detail.description } : null);
    };
    window.addEventListener('tool-confirm-request', handler);
    return () => window.removeEventListener('tool-confirm-request', handler);
  }, []);

  useEffect(() => {
    const unsub = onEvent('question_pending', (event) => {
      const p = event.payload;
      if (p.kind === 'plan_approval') return;
      setPendingQuestion({
        toolCallID: p.toolCallID as string,
        question: p.question as string,
        options: p.options as string[] | null,
        allowCustom: p.allowCustom as boolean,
        sessionID: event.sessionID,
      });
    });
    return unsub;
  }, []);

  const handleQuestionAnswer = useCallback((answer: string) => {
    if (!pendingQuestion) return;
    resolveDeferred(pendingQuestion.sessionID, pendingQuestion.toolCallID, answer);
    setPendingQuestion(null);
  }, [pendingQuestion]);

  const handleConfirmApprove = useCallback(() => {
    approveToolConfirmation();
    setPendingConfirm(null);
  }, []);

  const handleConfirmDeny = useCallback(() => {
    denyToolConfirmation();
    setPendingConfirm(null);
  }, []);

  return {
    pendingConfirm,
    pendingQuestion,
    setPendingQuestion,
    handleQuestionAnswer,
    handleConfirmApprove,
    handleConfirmDeny,
  };
}
