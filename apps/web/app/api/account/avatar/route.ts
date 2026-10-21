import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  try {
    const body = await req.arrayBuffer();
    const res = await fetch(`${API_BASE}/api/account/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('content-type') || 'multipart/form-data',
        ...(token ? { Authorization: token } : {}),
      },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 503 });
  }
}
