import type { ActionCheckResult } from '@hit/feature-pack-auth-core/server/lib/action-check';
import {
  checkActionPermission,
  requireActionPermission,
} from '@hit/feature-pack-auth-core/server/lib/action-check';

export async function checkWorkflowCoreAction(
  request: Request,
  actionKey: string
): Promise<ActionCheckResult> {
  return checkActionPermission(request, actionKey, { logPrefix: 'Workflow-Core' });
}

export async function requireWorkflowCoreAction(
  request: Request,
  actionKey: string
): Promise<Response | null> {
  return requireActionPermission(request, actionKey, { logPrefix: 'Workflow-Core' });
}
