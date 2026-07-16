export interface PlanStep {
  readonly id: string;
  readonly description: string;
  readonly toolName?: string;
  readonly expectedInput?: Record<string, unknown>;
}

export interface Plan {
  readonly planId: string;
  readonly title: string;
  readonly steps: readonly PlanStep[];
  readonly status: 'pending' | 'approved' | 'rejected' | 'modified';
  readonly sessionID: string;
  readonly modifiedSteps?: readonly PlanStep[];
}

const plans = new Map<string, Plan>();

export function createPlan(plan: Plan): void {
  plans.set(plan.planId, plan);
}

export function getPlan(planId: string): Plan | undefined {
  return plans.get(planId);
}

export function updatePlanStatus(planId: string, status: Plan['status'], modifiedSteps?: readonly PlanStep[]): void {
  const plan = plans.get(planId);
  if (!plan) return;
  plans.set(planId, {
    ...plan,
    status,
    ...(modifiedSteps ? { modifiedSteps } : {}),
  });
}

export function resolvePendingPlans(sessionID: string): Plan[] {
  return [...plans.values()].filter(p => p.sessionID === sessionID && p.status === 'pending');
}

export function clearSessionPlans(sessionID: string): void {
  for (const [k, v] of plans) {
    if (v.sessionID === sessionID) plans.delete(k);
  }
}
