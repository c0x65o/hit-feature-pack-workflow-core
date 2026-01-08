import { NextResponse } from 'next/server';
import { and, asc, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflows, workflowAcls, workflowRuns, WORKFLOW_PERMISSIONS } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { getPrincipals, isAdmin } from './_workflow-access';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/**
 * GET /api/workflows/runs
 *
 * Admin: list all runs across all workflows.
 * Non-admin: list runs only for workflows where caller has WORKFLOWS_VIEW_RUNS.
 */
export async function GET(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
        const offset = (page - 1) * pageSize;
        const search = (searchParams.get('search') || '').trim();
        const status = (searchParams.get('status') || '').trim();
        const sortBy = (searchParams.get('sortBy') || 'createdAt').trim();
        const sortOrder = (searchParams.get('sortOrder') || 'desc').trim();
        const sortColumns = {
            createdAt: workflowRuns.createdAt,
            startedAt: workflowRuns.startedAt,
            // Schema column is endedAt; keep "completedAt" as the API-facing sort key.
            completedAt: workflowRuns.endedAt,
            status: workflowRuns.status,
        };
        const orderCol = sortColumns[sortBy] ?? workflowRuns.createdAt;
        const orderDirection = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);
        // ACL: build allowed workflow IDs for non-admin.
        const isUserAdmin = isAdmin(user.roles);
        let allowedWorkflowIds = [];
        if (!isUserAdmin) {
            const principals = await getPrincipals(request, user);
            const userIds = [];
            if (principals.userId)
                userIds.push(principals.userId);
            if (principals.userEmail)
                userIds.push(principals.userEmail);
            const aclConds = [];
            if (userIds.length > 0) {
                aclConds.push(and(eq(workflowAcls.principalType, 'user'), inArray(workflowAcls.principalId, userIds)));
            }
            if (principals.roles.length > 0) {
                aclConds.push(and(eq(workflowAcls.principalType, 'role'), inArray(workflowAcls.principalId, principals.roles)));
            }
            if (principals.groupIds.length > 0) {
                aclConds.push(and(eq(workflowAcls.principalType, 'group'), inArray(workflowAcls.principalId, principals.groupIds)));
            }
            if (aclConds.length === 0) {
                return NextResponse.json({ items: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
            }
            const allowed = await db
                .select({ workflowId: workflowAcls.workflowId })
                .from(workflowAcls)
                .where(and(or(...aclConds), sql `${workflowAcls.permissions}::jsonb @> ${JSON.stringify([WORKFLOW_PERMISSIONS.WORKFLOWS_VIEW_RUNS])}::jsonb`))
                .groupBy(workflowAcls.workflowId);
            allowedWorkflowIds = allowed.map((r) => String(r.workflowId)).filter(Boolean);
            if (allowedWorkflowIds.length === 0) {
                return NextResponse.json({ items: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
            }
        }
        const conditions = [];
        if (!isUserAdmin) {
            conditions.push(inArray(workflowRuns.workflowId, allowedWorkflowIds));
        }
        if (status) {
            conditions.push(eq(workflowRuns.status, status));
        }
        if (search) {
            conditions.push(or(like(workflows.name, `%${search}%`), like(workflows.slug, `%${search}%`), like(workflowRuns.id, `%${search}%`), like(workflowRuns.correlationId, `%${search}%`)));
        }
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const countQ = db
            .select({ count: sql `count(*)` })
            .from(workflowRuns)
            .leftJoin(workflows, eq(workflowRuns.workflowId, workflows.id));
        const [countRow] = whereClause ? await countQ.where(whereClause) : await countQ;
        const total = Number(countRow?.count || 0);
        const rows = await db
            .select({
            run: workflowRuns,
            workflow: { id: workflows.id, name: workflows.name, slug: workflows.slug },
        })
            .from(workflowRuns)
            .leftJoin(workflows, eq(workflowRuns.workflowId, workflows.id))
            .where(whereClause)
            .orderBy(orderDirection)
            .limit(pageSize)
            .offset(offset);
        const items = rows.map((r) => ({
            ...r.run,
            // Back-compat: UI expects completedAt, but DB schema uses endedAt.
            completedAt: r.run?.endedAt ?? null,
            workflowName: r.workflow?.name ?? null,
            workflowSlug: r.workflow?.slug ?? null,
        }));
        return NextResponse.json({
            items,
            pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    }
    catch (error) {
        console.error('[workflows] List global runs error:', error);
        return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
    }
}
