import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TIMEOUT_MS = 10_000;

const err503 = () =>
  NextResponse.json({ error: 'API unavailable. Is the server running?' }, { status: 503 });

function apiUrl(path: string[]) {
  return `${API_BASE}/api/${path.join('/')}`;
}

function authHeader(req: NextRequest): Record<string, string> {
  const token = req.headers.get('authorization');
  return token ? { Authorization: token } : {};
}

async function proxyFetch(input: RequestInfo, init: RequestInit): Promise<NextResponse> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(input, { ...init, signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return err503();
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyFetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const body = await req.json().catch(() => undefined);
  return proxyFetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const body = await req.json().catch(() => undefined);
  return proxyFetch(apiUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(req) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxyFetch(apiUrl(path), {
    method: 'DELETE',
    headers: authHeader(req),
  });
}
