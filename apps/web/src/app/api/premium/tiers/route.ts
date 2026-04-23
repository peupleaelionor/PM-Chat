import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * GET /api/premium/tiers — List available premium tiers.
 * Public endpoint — cached at edge for performance.
 */
export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/premium/tiers`, {
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        // Cache tier info at edge for 5 minutes
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Service premium indisponible' },
      { status: 503 }
    );
  }
}

/**
 * POST /api/premium/tiers — Activate a premium tier.
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

    const response = await fetch(`${API_URL}/api/premium/activate`, {
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
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Erreur d\'activation du plan premium' },
      { status: 503 }
    );
  }
}
