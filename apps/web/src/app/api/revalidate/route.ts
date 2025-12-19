/**
 * API Route for On-Demand Revalidation
 * Allows admin panel to trigger revalidation of cached pages
 * 
 * Usage: POST /api/revalidate
 * Body: { path: '/products/123', secret: 'REVALIDATION_SECRET' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

// Secret for securing revalidation endpoint
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || 'development-secret';

interface RevalidateRequest {
  path?: string;
  tag?: string;
  type?: 'path' | 'tag';
  secret: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RevalidateRequest = await request.json();
    const { path, tag, type = 'path', secret } = body;

    // Validate secret
    if (secret !== REVALIDATION_SECRET) {
      return NextResponse.json(
        { error: 'Invalid revalidation secret' },
        { status: 401 }
      );
    }

    // Validate input
    if (!path && !tag) {
      return NextResponse.json(
        { error: 'Either path or tag is required' },
        { status: 400 }
      );
    }

    // Perform revalidation
    if (type === 'tag' && tag) {
      revalidateTag(tag);
      console.log(`[Revalidate] Tag revalidated: ${tag}`);
      return NextResponse.json({
        revalidated: true,
        type: 'tag',
        tag,
        timestamp: new Date().toISOString(),
      });
    } else if (path) {
      revalidatePath(path);
      console.log(`[Revalidate] Path revalidated: ${path}`);
      return NextResponse.json({
        revalidated: true,
        type: 'path',
        path,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('[Revalidate] Error:', error);
    return NextResponse.json(
      { error: 'Revalidation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for easy testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  const secret = searchParams.get('secret');

  if (!secret || secret !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  try {
    revalidatePath(path);
    return NextResponse.json({
      revalidated: true,
      path,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Revalidation failed' },
      { status: 500 }
    );
  }
}
