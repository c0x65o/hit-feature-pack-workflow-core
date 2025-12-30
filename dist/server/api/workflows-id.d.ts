import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * GET /api/workflows/[id]
 * Returns workflow + latest draft version (if any).
 */
export declare function GET(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    workflow: any;
    draft: any;
}>>;
/**
 * PUT /api/workflows/[id]
 * Updates workflow metadata and draft definition.
 */
export declare function PUT(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    workflow: any;
    draft: any;
}>>;
//# sourceMappingURL=workflows-id.d.ts.map