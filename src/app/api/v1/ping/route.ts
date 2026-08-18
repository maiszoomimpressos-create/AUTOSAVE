import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api-keys";

// Lightweight connectivity/auth check for partner integrations. Doesn't touch
// any resource table, so it's useful to tell apart "our network path /
// x-api-key is broken" from "the actual create/update call is failing".
export async function GET(request: Request) {
  const rawKey = request.headers.get("x-api-key");

  if (!rawKey) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const key = await verifyApiKey(rawKey);

  if (!key) {
    return NextResponse.json({ error: "Chave de API inválida." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    resource: key.resource,
    key_name: key.name,
    server_time: new Date().toISOString(),
  });
}
