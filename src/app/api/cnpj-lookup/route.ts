import { NextResponse } from "next/server";

// GET /api/cnpj-lookup?cnpj=00000000000000
// Proxy pra BrasilAPI — evita problema de CORS chamando direto do navegador,
// e mantém a chamada num único lugar caso a gente troque de provedor depois.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cnpj = (searchParams.get("cnpj") ?? "").replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({ found: false });
    }

    const data = await res.json();

    return NextResponse.json({
      found: true,
      razao_social: data.razao_social ?? null,
      nome_fantasia: data.nome_fantasia ?? null,
      email: data.email ?? null,
      phone: data.ddd_telefone_1 ?? null,
      zip_code: data.cep ?? null,
      street: data.logradouro ?? null,
      street_number: data.numero ?? null,
      neighborhood: data.bairro ?? null,
      city: data.municipio ?? null,
      state: data.uf ?? null,
      complement: data.complemento ?? null,
      situacao: data.descricao_situacao_cadastral ?? null,
    });
  } catch {
    return NextResponse.json({ found: false });
  }
}
