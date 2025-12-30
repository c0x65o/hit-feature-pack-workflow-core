import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { workflowAcls, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { hasWorkflowAclAccess, isAdmin } from './_workflow-access';

function extractWorkflowAndAclId(request: NextRequest): { workflowId: string | null; aclId: string | null } {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/workflows/{id}/acl/{aclId}
  const idx = parts.findIndex((p) => p === 'workflows');
  const workflowId = idx >= 0 ? parts[idx + 1] || null : null;
  const aclIdx = parts.findIndex((p) => p === 'acl');
  const aclId = aclIdx >= 0 ? parts[aclIdx + 1] || null : null;
  return { workflowId, aclId };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DELETE /api/workflows/[id]/acl/[aclId]
 */
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { workflowId, aclId } = extractWorkflowAndAclId(request);
    if (!workflowId || !aclId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const canManage =
      isAdmin(user.roles) ||
      (await hasWorkflowAclAccess(db, workflowId, request, WORKFLOW_PERMISSIONS.WORKFLOWS_MANAGE_ACL));
    if (!canManage) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const [deleted] = await db
      .delete(workflowAcls)
      .where(and(eq(workflowAcls.id, aclId), eq(workflowAcls.workflowId, workflowId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'ACL entry not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[workflows] ACL delete error:', error);
    return NextResponse.json({ error: 'Failed to delete workflow ACL entry' }, { status: 500 });
  }
}

