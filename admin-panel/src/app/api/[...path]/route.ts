import { NextRequest, NextResponse } from "next/server";

// Map first path segment to the correct Xano base URL
const XANO_BASES: Record<string, string> = {
  auth:             "https://x8ki-letl-twmt.n7.xano.io/api:Vbfe5lun:v1",
  profiles:         "https://x8ki-letl-twmt.n7.xano.io/api:YZl-BhQi:v1",
  bidders:          "https://x8ki-letl-twmt.n7.xano.io/api:I8ZiQ9Me:v1",
  rules:            "https://x8ki-letl-twmt.n7.xano.io/api:99AB050c:v1",
  tokens:           "https://x8ki-letl-twmt.n7.xano.io/api:KWCAt72v:v1",
  "access-control": "https://x8ki-letl-twmt.n7.xano.io/api:Ucs3etMr:v1",
  dashboard:        "https://x8ki-letl-twmt.n7.xano.io/api:5kArnPy5:v1",
  logs:             "https://x8ki-letl-twmt.n7.xano.io/api:fMYNj_1_:v1",
  resume:           "https://x8ki-letl-twmt.n7.xano.io/api:caf8Eo15:v1",
};

async function proxyRequest(req: NextRequest, segments: string[]) {
  const group = segments[0];
  const base = XANO_BASES[group];

  if (!base) {
    return NextResponse.json({ error: `Unknown API group: ${group}` }, { status: 404 });
  }

  // Full path forwarded (e.g. /api/auth/login → base/auth/login)
  const targetPath = "/" + segments.join("/");
  const search = req.nextUrl.search ?? "";
  const targetUrl = `${base}${targetPath}${search}`;

  // Forward relevant headers, drop host
  const headers = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (["host", "connection", "transfer-encoding"].includes(key.toLowerCase())) continue;
    headers.set(key, value);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const data = await upstream.arrayBuffer();

    return new NextResponse(data, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}
