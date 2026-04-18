import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * POST /api/premium/verify — Verify if a feature is available for user's tier.
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

    const response = await fetch(`${API_URL}/api/premium/verify`, {
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
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Vérification premium indisponible' },
      { status: 503 }
    );
  }
}
