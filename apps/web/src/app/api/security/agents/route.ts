import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * GET /api/security/agents — Proxy to backend security agents status.
 * Adds Vercel edge caching and CORS headers.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${API_URL}/api/security/agents`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Security-Agent': 'pm-chat-vercel-proxy',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Service de sécurité indisponible' },
      { status: 503 }
    );
  }
}
