import { NextResponse } from 'next/server';

/**
 * GET /api/health — Vercel serverless health check.
 * Provides edge-level health status for the web application.
 */
export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  let backendStatus: 'ok' | 'unreachable' = 'unreachable';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${apiUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      backendStatus = 'ok';
    }
  } catch {
    backendStatus = 'unreachable';
  }

  return NextResponse.json({
    status: 'ok',
    service: 'pm-chat-web',
    backend: backendStatus,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
    version: '1.0.0',
  });
}
