import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * POST /api/security/link-guard — Create a protected share link.
 * Proxies to backend with Vercel edge security.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/api/share`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
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
      { error: 'Erreur lors de la création du lien protégé' },
      { status: 503 }
    );
  }
}

/**
 * GET /api/security/link-guard — Get user's active share links.
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
    const response = await fetch(`${API_URL}/api/share/links`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'private, no-cache',
        'X-Security-Agent': 'link-guard',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Service indisponible' },
      { status: 503 }
    );
  }
}
