import { NextResponse } from "next/server";
import { verifyApiKey, type ApiKeyRecord } from "@/lib/api-keys";

export async function requireApiKey(
  request: Request,
  resource: string,
): Promise<{ key: ApiKeyRecord } | { response: NextResponse }> {
  const rawKey = request.headers.get("x-api-key");

  if (!rawKey) {
    return {
      response: NextResponse.json({ error: "Não autorizado." }, { status: 401 }),
    };
  }

  const key = await verifyApiKey(rawKey);

  if (!key) {
    return {
      response: NextResponse.json({ error: "Chave de API inválida." }, { status: 401 }),
    };
  }

  if (key.resource !== resource) {
    return {
      response: NextResponse.json(
        { error: "Esta chave não tem acesso a este recurso." },
        { status: 403 },
      ),
    };
  }

  return { key };
}
