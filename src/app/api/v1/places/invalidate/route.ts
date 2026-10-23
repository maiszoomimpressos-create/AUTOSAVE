import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { invalidatePlace } from "@/lib/places";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/v1/places/invalidate  body: {"place_id": "..."} ou {"id": "<uuid>"}  ("Local errado")
export async function POST(request: Request) {
  const auth = await requireApiKey(request, "places");
  if ("response" in auth) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }
  const id = typeof body.id === "string" && UUID_RE.test(body.id) ? body.id : undefined;
  const placeId = typeof body.place_id === "string" && body.place_id.trim() ? body.place_id.trim() : undefined;
  if (!id && !placeId) {
    return NextResponse.json({ error: "Informe 'place_id' ou 'id'." }, { status: 400 });
  }

  try {
    const invalidated = await invalidatePlace({ workspaceId: auth.key.workspace_id, id, placeId });
    return NextResponse.json({ ok: true, invalidated });
  } catch (e) {
    console.error("[api/v1/places/invalidate]", (e as Error).message);
    return NextResponse.json({ error: "Falha ao invalidar." }, { status: 500 });
  }
}
