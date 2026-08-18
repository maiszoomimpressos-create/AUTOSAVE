import { NextResponse } from "next/server";

// GET /api/fipe/marcas?type=car|motorcycle|truck
// Proxy pra tabela FIPE (parallelum) — evita CORS chamando direto do
// navegador, e mantém a chamada num único lugar caso a gente troque de
// provedor depois (mesmo padrão do /api/cnpj-lookup).
const FIPE_TYPE_MAP: Record<string, string> = {
  car: "carros",
  motorcycle: "motos",
  truck: "caminhoes",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const fipeType = FIPE_TYPE_MAP[type];

  if (!fipeType) {
    return NextResponse.json(
      { error: "Parâmetro 'type' precisa ser car, motorcycle ou truck." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${fipeType}/marcas`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Tabela FIPE indisponível." }, { status: 502 });
    }

    const data = (await res.json()) as { codigo: string; nome: string }[];
    return NextResponse.json({ marcas: data });
  } catch {
    return NextResponse.json({ error: "Tabela FIPE indisponível." }, { status: 502 });
  }
}
