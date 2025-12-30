import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { workflows, workflowVersions, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { hasWorkflowAclAccess, isAdmin } from './_workflow-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function extractId(request: NextRequest): string | null {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/workflows/{id}
  return parts[parts.length - 1] || null;
}

/**
 * GET /api/workflows/[id]
 * Returns workflow + latest draft version (if any).
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = extractId(request);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const canView = isAdmin(user.roles) || (await hasWorkflowAclAccess(db, id, request, WORKFLOW_PERMISSIONS.WORKFLOWS_VIEW));
    if (!canView) {
      // Avoid leaking existence
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const [wf] = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
    if (!wf) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    const [draft] = await db
      .select()
      .from(workflowVersions)
      .where(and(eq(workflowVersions.workflowId, id), eq(workflowVersions.status, 'draft')))
      .orderBy(desc(workflowVersions.version))
      .limit(1);

    return NextResponse.json({ workflow: wf, draft: draft || null });
  } catch (error) {
    console.error('[workflows] Get error:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
  }
}

/**
 * PUT /api/workflows/[id]
 * Updates workflow metadata and draft definition.
 */
export async function PUT(request: NextRequest) {
  try {
    const db = getDb();
    const user = extractUserFromRequest(request);
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = extractId(request);
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const canEdit = isAdmin(user.roles) || (await hasWorkflowAclAccess(db, id, request, WORKFLOW_PERMISSIONS.WORKFLOWS_EDIT));
    if (!canEdit) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    const body = await request.json().catch(() => ({}));

    // Update workflow metadata
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) update.name = body.name;
    if (body.description !== undefined) update.description = body.description || null;

    const [wf] = await db.update(workflows).set(update).where(eq(workflows.id, id)).returning();
    if (!wf) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    // Upsert draft version definition
    const definition = body?.draft?.definition ?? body?.definition;
    if (definition !== undefined) {
      const [draft] = await db
        .select()
        .from(workflowVersions)
        .where(and(eq(workflowVersions.workflowId, id), eq(workflowVersions.status, 'draft')))
        .orderBy(desc(workflowVersions.version))
        .limit(1);

      if (draft) {
        await db
          .update(workflowVersions)
          .set({ definition: definition || {} })
          .where(eq(workflowVersions.id, draft.id));
      } else {
        // Create a new draft version (version number = 1 if none)
        await db.insert(workflowVersions).values({
          workflowId: id,
          version: 1,
          status: 'draft',
          definition: definition || {},
          createdByUserId: user.sub,
        });
      }
    }

    const [freshDraft] = await db
      .select()
      .from(workflowVersions)
      .where(and(eq(workflowVersions.workflowId, id), eq(workflowVersions.status, 'draft')))
      .orderBy(desc(workflowVersions.version))
      .limit(1);

    return NextResponse.json({ workflow: wf, draft: freshDraft || null });
  } catch (error) {
    console.error('[workflows] Update error:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

