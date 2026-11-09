import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function auth(req: NextRequest): Record<string, string> {
  const token = req.headers.get('authorization');
  return token ? { Authorization: token } : {};
}

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${API_BASE}/api/provider/sat`, { headers: auth(req) });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'API unavailable. Is the server running?' }, { status: 503 });
  }
}

// Multipart upload of the SAT certificate, passed through unchanged.
export async function POST(req: NextRequest) {
  try {
    const body = await req.arrayBuffer();
    const res = await fetch(`${API_BASE}/api/provider/sat`, {
      method: 'POST',
      headers: { 'Content-Type': req.headers.get('content-type') ?? '', ...auth(req) },
      body: Buffer.from(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'API unavailable. Is the server running?' }, { status: 503 });
  }
}
