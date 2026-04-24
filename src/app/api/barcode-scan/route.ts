import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Client = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  keepAlive: NodeJS.Timeout;
};

const encoder = new TextEncoder();
const clientsByTenant = new Map<string, Set<Client>>();

function getTenantFromRequest(req: NextRequest) {
  const url = new URL(req.url);
  const tenantFromQuery = url.searchParams.get("tenant");
  const tenantFromHeader = req.headers.get("x-tenant");
  return String(tenantFromQuery || tenantFromHeader || "").trim();
}

function broadcastToTenant(tenant: string, barcode: string) {
  const clients = clientsByTenant.get(tenant);
  if (!clients || clients.size === 0) return;
  const payload = encoder.encode(`data: ${barcode}\n\n`);
  clients.forEach((client) => {
    try {
      client.controller.enqueue(payload);
    } catch {
      // ignore broken clients
    }
  });
}

export async function GET(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  if (!tenant) {
    return NextResponse.json({ message: "tenant is required" }, { status: 400 });
  }

  let clientRef: Client | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          // ignore
        }
      }, 25000);

      const client: Client = { controller, keepAlive };
      const set = clientsByTenant.get(tenant) ?? new Set<Client>();
      set.add(client);
      clientsByTenant.set(tenant, set);

      controller.enqueue(encoder.encode(`event: ready\ndata: connected\n\n`));
      clientRef = client;
    },
    cancel() {
      const set = clientsByTenant.get(tenant);
      if (!set) return;
      const client = clientRef;
      if (client) {
        set.delete(client);
        try {
          clearInterval(client.keepAlive);
        } catch {
          // ignore
        }
      }
      if (set.size === 0) {
        clientsByTenant.delete(tenant);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: NextRequest) {
  const tenant = getTenantFromRequest(req);
  if (!tenant) {
    return NextResponse.json({ message: "tenant is required" }, { status: 400 });
  }

  let payload: { barcode?: string } = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }
  const barcode = String(payload.barcode || "").trim();
  if (!barcode) {
    return NextResponse.json({ message: "barcode is required" }, { status: 400 });
  }

  broadcastToTenant(tenant, barcode);
  return NextResponse.json({ success: true });
}
