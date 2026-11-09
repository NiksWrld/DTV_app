import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization');
  const contentType = req.headers.get('content-type') ?? '';
  const headers: Record<string, string> = { 'Content-Type': contentType };
  if (token) headers['Authorization'] = token;
  const body = await req.arrayBuffer();
  const res = await fetch(`${API_BASE}/api/provider/photos`, {
    method: 'POST',
    headers,
    body: Buffer.from(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
