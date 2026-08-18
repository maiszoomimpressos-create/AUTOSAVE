import { NextResponse } from "next/server";

// GET /api/fipe/modelos?type=car|motorcycle|truck&marca=<codigo>
const FIPE_TYPE_MAP: Record<string, string> = {
  car: "carros",
  motorcycle: "motos",
  truck: "caminhoes",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const marca = searchParams.get("marca") ?? "";
  const fipeType = FIPE_TYPE_MAP[type];

  if (!fipeType) {
    return NextResponse.json(
      { error: "Parâmetro 'type' precisa ser car, motorcycle ou truck." },
      { status: 400 },
    );
  }
  if (!marca) {
    return NextResponse.json({ error: "Parâmetro 'marca' é obrigatório." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://parallelum.com.br/fipe/api/v1/${fipeType}/marcas/${encodeURIComponent(marca)}/modelos`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Tabela FIPE indisponível." }, { status: 502 });
    }

    const data = (await res.json()) as { modelos: { codigo: number; nome: string }[] };
    return NextResponse.json({ modelos: data.modelos ?? [] });
  } catch {
    return NextResponse.json({ error: "Tabela FIPE indisponível." }, { status: 502 });
  }
}
