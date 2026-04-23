import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * POST /api/share — Access a shared conversation via protected link token.
 * Public endpoint — no auth required (link access is token-based).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.token) {
      return NextResponse.json(
        { error: 'Jeton de partage requis' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/api/share/access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown',
        'User-Agent': request.headers.get('user-agent') ?? 'unknown',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Security-Agent': 'link-guard',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Service de partage indisponible' },
      { status: 503 }
    );
  }
}
