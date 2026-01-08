import { NextRequest, NextResponse } from 'next/server';
export declare const dynamic = "force-dynamic";
export declare const runtime = "nodejs";
/**
 * POST /api/workflows/[id]/publish
 *
 * Creates a new immutable published version from the current draft definition.
 */
export declare function POST(request: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    published: any;
}>>;
//# sourceMappingURL=workflows-id-publish.d.ts.map