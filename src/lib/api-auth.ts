import { NextResponse } from "next/server";

export function requireApiKey(request: Request): NextResponse | null {
  const key = request.headers.get("x-api-key");

  if (!key || key !== process.env.PARTNER_API_KEY) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return null;
}
