// Integração com a APIBrasil — consulta de veículo por placa ("Agregados
// Própria"), plano pago por crédito (R$ 0,08/consulta).
// Doc: https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits

const APIBRASIL_URL = "https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits";

// A doc oficial usa --max-time 120 no exemplo de curl — a consulta pode
// demorar bem mais que uma chamada de API comum.
const REQUEST_TIMEOUT_MS = 90_000;

export type ApiBrasilVehicleData = {
  placa: string;
  placaMercosul?: string;
  chassi?: string;
  fabricante?: string;
  marca?: string;
  // fipeId é inconsistente: às vezes vem o código FIPE do veículo (formato
  // "025267-0"), às vezes só o código numérico da marca (ex.: 21 = Fiat) —
  // por isso number|string aqui, e validação de formato em lib/fipe.ts antes
  // de usar como código de consulta.
  marcaDetalhes?: { nome?: string; fipeId?: string | number };
  modelo?: string;
  modeloDetalhes?: { nome?: string; sintetico?: string };
  versao?: string;
  ano_fabricacao?: number;
  ano_modelo?: number;
  motor_descricao?: string;
  transmissao_descricao?: string;
  combustivel?: string;
  tipo_veiculo?: string;
  especie?: string;
  cor?: string;
  numero_motor?: string;
  potencia?: number;
  cilindradas?: number;
  quantidade_portas?: number;
  quantidade_lugares?: number;
  cidade?: string;
  uf_jurisdicao?: string;
  [key: string]: unknown;
};

type ApiBrasilCreditsResponse = {
  error: boolean;
  status_code: number;
  message?: string;
  homolog?: boolean;
  valor_consulta?: number;
  data?: ApiBrasilVehicleData;
};

export type ApiBrasilLookupResult =
  | { ok: true; data: ApiBrasilVehicleData; homolog: boolean }
  | { ok: false; reason: string };

// Lê o token só na hora da chamada (não no import) — assim o "unset" continua
// se comportando como config ausente, não como erro de módulo.
function getBearerToken(): string | null {
  return process.env.APIBRASIL_BEARER_TOKEN || null;
}

// Modo teste: "true" só enquanto validamos a integração — em produção
// precisa ficar unset/false, senão a APIBrasil devolve dado de exemplo em
// vez do veículo de verdade (e não cobra, mas também não serve pra valer).
function isHomolog(): boolean {
  return process.env.APIBRASIL_HOMOLOG === "true";
}

export type ApiBrasilBalanceResult =
  | { ok: true; balance: number }
  | { ok: false; reason: string };

// GET /balance — endpoint separado do de consulta, devolve o saldo restante
// da conta (não confundir com `valor_consulta` da resposta de consulta, que
// é só o custo daquela chamada específica). Doc: exemplo oficial
// rest/curl/01-login-e-saldo.sh no repo apigratis-exemplos da APIBrasil.
export async function getAccountBalance(): Promise<ApiBrasilBalanceResult> {
  const token = getBearerToken();
  if (!token) {
    return { ok: false, reason: "not_configured" };
  }

  let res: Response;
  try {
    res = await fetch("https://gateway.apibrasil.io/api/v2/balance", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timeout" : "network_error";
    console.error(`[apibrasil] getAccountBalance falhou (${reason}):`, err);
    return { ok: false, reason };
  }

  if (!res.ok) {
    console.error(`[apibrasil] HTTP ${res.status} ao consultar saldo`);
    return { ok: false, reason: `http_${res.status}` };
  }

  // Campo confirmado como "saldo" no SDK oficial — "balance" como fallback
  // caso a API mude pro nome em inglês.
  const payload = (await res.json()) as { saldo?: unknown; balance?: unknown };
  const raw = payload.saldo ?? payload.balance;
  const balance = typeof raw === "number" ? raw : Number(raw);

  if (raw == null || Number.isNaN(balance)) {
    console.error("[apibrasil] resposta de saldo em formato inesperado:", payload);
    return { ok: false, reason: "unexpected_response" };
  }

  return { ok: true, balance };
}

export async function lookupVehicleByPlate(plate: string): Promise<ApiBrasilLookupResult> {
  const token = getBearerToken();
  if (!token) {
    return { ok: false, reason: "not_configured" };
  }

  let res: Response;
  try {
    res = await fetch(APIBRASIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo: "agregados-propria", placa: plate, homolog: isHomolog() }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timeout" : "network_error";
    console.error(`[apibrasil] lookupVehicleByPlate falhou (${reason}):`, err);
    return { ok: false, reason };
  }

  if (!res.ok) {
    console.error(`[apibrasil] HTTP ${res.status} pra placa ${plate}`);
    return { ok: false, reason: `http_${res.status}` };
  }

  const payload = (await res.json()) as ApiBrasilCreditsResponse;

  if (payload.error === true) {
    console.error(`[apibrasil] erro reportado pra placa ${plate}:`, payload.message);
    return { ok: false, reason: payload.message ?? "api_error" };
  }

  if (!payload.data || (!payload.data.marca && !payload.data.modelo)) {
    return { ok: false, reason: "not_found" };
  }

  return { ok: true, data: payload.data, homolog: payload.homolog === true };
}
