import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { parseCoord, searchPlaces } from "@/lib/places";

// GET /api/v1/places/search?q=...&lat=...&lng=...  (header x-api-key, recurso "places")
export async function GET(request: Request) {
  const auth = await requireApiKey(request, "places");
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 200) {
    return NextResponse.json({ error: "Informe o parâmetro 'q' (2 a 200 caracteres)." }, { status: 400 });
  }
  const lat = parseCoord(searchParams.get("lat"), 90);
  const lng = parseCoord(searchParams.get("lng"), 180);
  if ((lat == null) !== (lng == null)) {
    return NextResponse.json({ error: "Informe 'lat' e 'lng' juntos (ou nenhum)." }, { status: 400 });
  }

  try {
    const result = await searchPlaces({ workspaceId: auth.key.workspace_id, q, lat, lng });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/v1/places/search]", (e as Error).message);
    return NextResponse.json({ error: "Falha ao buscar endereço." }, { status: 502 });
  }
}
