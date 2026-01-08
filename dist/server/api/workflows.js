import { NextResponse } from 'next/server';
import { asc, desc, eq, inArray, like, or, sql, and } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { workflows, workflowAcls, workflowVersions } from '@/lib/feature-pack-schemas';
import { extractUserFromRequest } from '../auth';
import { DEFAULT_CREATOR_PERMISSIONS, isAdmin, getPrincipals } from './_workflow-access';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
/**
 * GET /api/workflows
 *
 * Admin:
 * - can list all workflows
 *
 * Non-admin:
 * - lists workflows where the user has any ACL entry granting at least one permission.
 */
export async function GET(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
        const offset = (page - 1) * pageSize;
        const sortBy = searchParams.get('sortBy') || 'updatedAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const search = searchParams.get('search') || '';
        const sortColumns = {
            name: workflows.name,
            slug: workflows.slug,
            createdAt: workflows.createdAt,
            updatedAt: workflows.updatedAt,
        };
        const orderCol = sortColumns[sortBy] ?? workflows.updatedAt;
        const orderDirection = sortOrder === 'asc' ? asc(orderCol) : desc(orderCol);
        const conditions = [];
        if (search) {
            conditions.push(or(like(workflows.name, `%${search}%`), like(workflows.slug, `%${search}%`)));
        }
        // Admin: no ACL filter.
        if (isAdmin(user.roles)) {
            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
            const [countResult] = await db
                .select({ count: sql `count(*)` })
                .from(workflows)
                .where(whereClause);
            const total = Number(countResult?.count || 0);
            const items = await db
                .select()
                .from(workflows)
                .where(whereClause)
                .orderBy(orderDirection)
                .limit(pageSize)
                .offset(offset);
            return NextResponse.json({
                items,
                pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
            });
        }
        // Non-admin: list workflows where user has *any* ACL entry.
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
            .where(or(...aclConds))
            .groupBy(workflowAcls.workflowId);
        const allowedIds = allowed.map((r) => String(r.workflowId)).filter(Boolean);
        if (allowedIds.length === 0) {
            return NextResponse.json({ items: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
        }
        const whereClause = and(inArray(workflows.id, allowedIds), ...(conditions.length > 0 ? [and(...conditions)] : []));
        const [countResult] = await db.select({ count: sql `count(*)` }).from(workflows).where(whereClause);
        const total = Number(countResult?.count || 0);
        const items = await db
            .select()
            .from(workflows)
            .where(whereClause)
            .orderBy(orderDirection)
            .limit(pageSize)
            .offset(offset);
        return NextResponse.json({
            items,
            pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        });
    }
    catch (error) {
        console.error('[workflows] List error:', error);
        return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
    }
}
/**
 * POST /api/workflows
 *
 * Creates:
 * - workflows row
 * - initial draft version (v1)
 * - creator ACL entry (full permissions) to keep default-closed behavior
 */
export async function POST(request) {
    try {
        const db = getDb();
        const user = extractUserFromRequest(request);
        if (!user?.sub) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json().catch(() => ({}));
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }
        const slug = typeof body?.slug === 'string' && body.slug.trim() ? slugify(body.slug) : slugify(name);
        const description = typeof body?.description === 'string' ? body.description.trim() : null;
        const [created] = await db
            .insert(workflows)
            .values({
            name,
            slug,
            description: description || null,
            ownerUserId: user.sub,
        })
            .returning();
        // Create initial draft version
        await db.insert(workflowVersions).values({
            workflowId: created.id,
            version: 1,
            status: 'draft',
            definition: {},
            createdByUserId: user.sub,
        });
        // Creator ACL: full permissions
        await db.insert(workflowAcls).values({
            workflowId: created.id,
            principalType: 'user',
            principalId: user.sub,
            permissions: DEFAULT_CREATOR_PERMISSIONS,
            createdBy: user.sub,
        });
        return NextResponse.json(created, { status: 201 });
    }
    catch (error) {
        console.error('[workflows] Create error:', error);
        return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
    }
}
