import { NextRequest, NextResponse } from "next/server";

const XANO_HOST = process.env.XANO_HOST || "https://api.shsws-solutions.com";

const XANO_CANONICALS: Record<string, string> = {
  auth: "Vbfe5lun",
  profiles: "YZl-BhQi",
  users: "I8ZiQ9Me",
  rules: "99AB050c",
  tokens: "KWCAt72v",
  "access-control": "Ucs3etMr",
  dashboard: "5kArnPy5",
  logs: "fMYNj_1_",
  resume: "caf8Eo15",
  public: "W5ffWHW-",
  "extension-versions": "eqIK8vAt",
  // Override with XANO_EXTENSION_MGMT_CANONICAL if the extension_mgmt API group has a different canonical id
  "extensions": process.env.XANO_EXTENSION_MGMT_CANONICAL || "eqIK8vAt",
  mail_triage_allowlist: "weyKu-kg",
  blacklist: "YZl-BhQi",
};

const XANO_BASES: Record<string, string> = Object.fromEntries(
  Object.entries(XANO_CANONICALS).map(([group, canonical]) => [group, `${XANO_HOST}/api:${canonical}`])
) as Record<string, string>;

if (process.env.XANO_ALLOW_SELF_SIGNED === "true") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
  };

  if (!["GET", "HEAD"].includes(req.method) && req.body) {
    const contentType = req.headers.get("content-type") || "";
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentType.toLowerCase().startsWith("multipart/") || contentLength > 1024 * 1024) {
      // Large / file uploads: stream the raw body through untouched (keeps the multipart boundary
      // and content-type header, never buffers the whole file in memory).
      init.body = req.body as any;
      init.duplex = "half";
    } else {
      const body = await req.arrayBuffer();
      if (body.byteLength > 0) {
        init.body = body;
      }
    }
  }

  try {
    const upstream = await fetch(targetUrl, init);
    const resHeaders: Record<string, string> = {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    };
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) resHeaders["content-disposition"] = disposition;

    // Stream the response body back (no buffering of large downloads)
    return new NextResponse(upstream.body, { status: upstream.status, headers: resHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, targetUrl }, { status: 502 });
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
