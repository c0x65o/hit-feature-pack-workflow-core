import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows
 *
 * Admin:
 * - can list all workflows
 *
 * Non-admin:
 * - lists workflows where the user has any ACL entry granting at least one permission.
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    items: any;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}>>;
/**
 * POST /api/workflows
 *
 * Creates:
 * - workflows row
 * - initial draft version (v1)
 * - creator ACL entry (full permissions) to keep default-closed behavior
 */
export declare function POST(request: NextRequest): Promise<NextResponse<any>>;
//# sourceMappingURL=workflows.d.ts.map