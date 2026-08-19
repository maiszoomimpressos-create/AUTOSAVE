// Motor central de classificação automática de veículos do AutoSave.
//
// Ver AGENTS.md ("AutoSave — Sistema Completo de Classificação Automática de
// Veículos") pra a especificação completa. Este módulo é a ÚNICA
// implementação das regras — cadastro manual, consulta de placa, API v1 e
// qualquer importação futura devem chamar `classificarVeiculo()` daqui, não
// reimplementar regras próprias (spec §39).
//
// Pipeline: normalização → identificação do tipo → regras de classificação
// (por prioridade) → deduções → marca/modelo → fallback → resultado.
//
// Nunca lê nem grava `tipo_original` / `marca_original` / `modelo_original`
// como "o dado" — esses campos são preservados intactos por quem persiste o
// resultado (spec §36); este módulo só decide a `categoria_*`.

export const VEHICLE_CATEGORIES = [
  { id: 1, codigo: "CARRO", nome: "Carro" },
  { id: 2, codigo: "MOTO", nome: "Moto" },
  { id: 3, codigo: "CAMINHAO", nome: "Caminhão" },
  { id: 4, codigo: "ONIBUS", nome: "Ônibus" },
  { id: 5, codigo: "VAN", nome: "Van" },
  { id: 6, codigo: "PICKUP", nome: "Pickup" },
  { id: 7, codigo: "UTILITARIO", nome: "Utilitário" },
  { id: 8, codigo: "TRATOR", nome: "Trator" },
  { id: 9, codigo: "COLHEITADEIRA", nome: "Colheitadeira" },
  { id: 10, codigo: "EMPILHADEIRA", nome: "Empilhadeira" },
  { id: 11, codigo: "GERADOR", nome: "Gerador" },
  { id: 12, codigo: "REBOQUE", nome: "Reboque" },
  { id: 13, codigo: "SEMIRREBOQUE", nome: "Semirreboque" },
  { id: 14, codigo: "CARRETA", nome: "Carreta" },
  { id: 15, codigo: "MOTORHOME", nome: "Motorhome" },
  { id: 16, codigo: "AMBULANCIA", nome: "Ambulância" },
  { id: 17, codigo: "VEICULO_ESPECIAL", nome: "Veículo especial" },
  { id: 18, codigo: "MAQUINA_AGRICOLA", nome: "Máquina agrícola" },
  { id: 19, codigo: "MAQUINA_CONSTRUCAO", nome: "Máquina de construção" },
  { id: 20, codigo: "ELETRICO", nome: "Veículo elétrico" },
  { id: 21, codigo: "OUTRO", nome: "Outro" },
  { id: 22, codigo: "NAO_IDENTIFICADO", nome: "Não identificado" },
] as const;

export type CategoriaCodigo = (typeof VEHICLE_CATEGORIES)[number]["codigo"];

const CATEGORY_BY_CODIGO = new Map(VEHICLE_CATEGORIES.map((c) => [c.codigo, c]));

export type ClassificacaoMetodo =
  | "TIPO_API"
  | "ESPECIE_API"
  | "DESCRICAO_API"
  | "MARCA_MODELO"
  | "DEDUCAO"
  | "PALAVRA_CHAVE"
  | "FALLBACK"
  | "NAO_IDENTIFICADO";

export type ClassificationResult = {
  categoria_id: number;
  categoria_codigo: CategoriaCodigo;
  categoria_nome: string;
  classificacao_metodo: ClassificacaoMetodo;
  classificacao_confianca: number;
  regra: string;
};

// Ponte com o enum antigo/curto `type` (car/motorcycle/truck/...) usado no
// cadastro manual e na API v1 — quando não há dado bruto da API de placa
// disponível (ex.: veículo cadastrado à mão), o `type` escolhido pelo
// usuário vira o melhor palpite de `tipoOriginal` pra classificação. Só
// mapeia valores com correspondência direta e inequívoca; "equipment" e
// "other" ficam de fora de propósito — são categorias-guarda-chuva do enum
// antigo, mapeá-las cegamente erraria mais do que ajudaria (melhor deixar a
// dedução por marca/modelo decidir).
const TYPE_ENUM_TO_KEYWORD: Record<string, string> = {
  car: "automovel",
  motorcycle: "motocicleta",
  truck: "caminhao",
  bus: "onibus",
  van: "van",
  tractor: "trator",
  harvester: "colheitadeira",
  forklift: "empilhadeira",
  generator: "gerador",
  trailer: "reboque",
};

export function typeEnumToKeyword(type: string | null | undefined): string | null {
  if (!type) return null;
  return TYPE_ENUM_TO_KEYWORD[type] ?? null;
}

export type ClassifierInput = {
  /** Tipo de veículo explícito retornado pela API (ex.: "CAMINHONETE"). */
  tipoOriginal?: string | null;
  /** Espécie/categoria oficial retornada pela API (ex.: "PASSAGEIRO"). */
  especieOriginal?: string | null;
  /** Descrição livre do veículo, quando disponível (ex.: versão/modelo_detalhe). */
  descricaoOriginal?: string | null;
  marcaOriginal?: string | null;
  modeloOriginal?: string | null;
  /** Pistas técnicas usadas só como dedução, quando o tipo não for suficiente. */
  cilindradas?: number | null;
  eixos?: number | null;
  lugares?: number | null;
  pesoBrutoKg?: number | null;
};

// ---------------------------------------------------------------------------
// 1. Normalização (spec §4)
// ---------------------------------------------------------------------------

export function normalizeText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ") // remove caracteres especiais (mantém hífen/espaço)
    .replace(/-/g, " ") // normaliza hífen: "semi-reboque" == "semi reboque"
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Casa por palavra/frase inteira, não substring solta — sem isso "reboque"
// (REBOQUE) bateria dentro de "semirreboque" (SEMIRREBOQUE), já que os dois
// termos viram uma palavra só depois da normalização (sem hífen/espaço entre
// "semir" e "reboque"). \b já lida certo com frases de várias palavras,
// porque o espaço interno normalizado já é um limite de palavra.
const KEYWORD_REGEX_CACHE = new Map<string, RegExp>();
function keywordRegex(keyword: string): RegExp {
  let re = KEYWORD_REGEX_CACHE.get(keyword);
  if (!re) {
    re = new RegExp(`\\b${escapeRegExp(keyword)}\\b`);
    KEYWORD_REGEX_CACHE.set(keyword, re);
  }
  return re;
}

function containsAny(text: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    if (keywordRegex(kw).test(text)) return kw;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Palavras-chave por categoria, já em ordem de prioridade (spec §5–§27)
// ---------------------------------------------------------------------------

type KeywordRule = { codigo: CategoriaCodigo; keywords: string[] };

// Ordem de prioridade oficial (spec §27). REBOQUE/SEMIRREBOQUE/CARRETA e
// TRATOR/COLHEITADEIRA vêm antes de CARRO/CAMINHAO de propósito — evita que
// "caminhao trator" ou "carreta" caiam em CAMINHAO por engano.
const KEYWORD_RULES: KeywordRule[] = [
  { codigo: "REBOQUE", keywords: ["reboque", "trailer", "carretinha"] },
  { codigo: "SEMIRREBOQUE", keywords: ["semirreboque", "semi reboque"] },
  {
    codigo: "CARRETA",
    keywords: [
      "carreta tanque",
      "carreta basculante",
      "carreta frigorifica",
      "carreta prancha",
      "carreta",
    ],
  },
  {
    codigo: "TRATOR",
    keywords: ["trator agricola", "trator de esteira", "trator de rodas", "trator"],
  },
  {
    codigo: "COLHEITADEIRA",
    keywords: ["colheitadeira agricola", "colheitadeira", "colhedora"],
  },
  { codigo: "EMPILHADEIRA", keywords: ["empilhadeira", "forklift"] },
  { codigo: "GERADOR", keywords: ["gerador eletrico", "grupo gerador", "gerador"] },
  {
    codigo: "MAQUINA_AGRICOLA",
    keywords: [
      "maquina agricola",
      "implemento agricola",
      "pulverizador",
      "plantadeira",
      "semeadeira",
      "ensiladeira",
    ],
  },
  {
    codigo: "MAQUINA_CONSTRUCAO",
    keywords: [
      "retroescavadeira",
      "retro escavadeira",
      "escavadeira",
      "pa carregadeira",
      "motoniveladora",
      "rolo compactador",
      "compactador",
      "minicarregadeira",
      "mini carregadeira",
      "carregadeira",
      "perfuratriz",
      "guindaste",
    ],
  },
  {
    codigo: "AMBULANCIA",
    keywords: ["ambulancia", "unidade movel de atendimento"],
  },
  { codigo: "MOTORHOME", keywords: ["motorhome", "motor home", "motor casa"] },
  {
    codigo: "ONIBUS",
    keywords: [
      "onibus",
      "microonibus",
      "micro onibus",
      "veiculo de transporte coletivo",
      "transporte coletivo",
    ],
  },
  {
    codigo: "CAMINHAO",
    keywords: [
      "caminhao trator",
      "caminhao basculante",
      "caminhao tanque",
      "caminhao munck",
      "caminhao frigorifico",
      "caminhao plataforma",
      "cavalo mecanico",
      "caminhao",
      "truck",
    ],
  },
  {
    codigo: "MOTO",
    keywords: [
      "motocicleta",
      "motociclo",
      "motoneta",
      "ciclomotor",
      "triciclo",
      "quadriciclo",
      "scooter",
      "moto",
    ],
  },
  {
    codigo: "PICKUP",
    keywords: ["caminhonete", "camioneta", "pick up", "pickup", "picape"],
  },
  {
    codigo: "VAN",
    keywords: ["furgoneta", "furgao", "mini bus", "minibus", "van"],
  },
  {
    codigo: "UTILITARIO",
    keywords: ["furgao utilitario", "comercial leve", "veiculo utilitario", "utilitario"],
  },
  {
    codigo: "VEICULO_ESPECIAL",
    keywords: ["plataforma especial", "veiculo adaptado", "veiculo especial", "especial"],
  },
  {
    codigo: "ELETRICO",
    keywords: ["100 eletrico", "eletrico", "electric", "bev"],
  },
  {
    codigo: "CARRO",
    keywords: [
      "veiculo de passeio",
      "veiculo passeio",
      "automovel",
      "misto",
      "passageiro",
      "carro",
      "auto",
    ],
  },
];

// Modelos conhecidos que ajudam a desempatar quando o tipo oficial não veio
// (spec §9–§11). Só entram em jogo via classifyByModel(), nunca sobrepõem um
// tipo/espécie que a API já informou explicitamente.
const MODEL_RULES: { codigo: CategoriaCodigo; models: string[] }[] = [
  {
    codigo: "PICKUP",
    models: [
      "strada",
      "saveiro",
      "montana",
      "hilux",
      "ranger",
      "s10",
      "frontier",
      "toro",
      "amarok",
      "maverick",
      "oroch",
      "ram",
    ],
  },
  {
    codigo: "VAN",
    models: ["sprinter", "master", "ducato", "boxer", "jumper", "transit", "daily"],
  },
  {
    codigo: "UTILITARIO",
    models: ["fiorino", "kangoo", "partner", "berlingo", "doblo cargo", "doblo"],
  },
];

// ---------------------------------------------------------------------------
// 3. Deduções por características técnicas (spec §29)
// ---------------------------------------------------------------------------

function deduceFromSpecs(input: ClassifierInput): CategoriaCodigo | null {
  const { cilindradas, eixos, lugares, pesoBrutoKg } = input;

  if (lugares != null && lugares >= 10) return "ONIBUS";
  if ((eixos != null && eixos >= 3) || (pesoBrutoKg != null && pesoBrutoKg >= 3500)) {
    return "CAMINHAO";
  }
  if (cilindradas != null && cilindradas > 0 && cilindradas <= 500) return "MOTO";

  return null;
}

// ---------------------------------------------------------------------------
// 4. Resultado / fallback
// ---------------------------------------------------------------------------

function buildResult(
  codigo: CategoriaCodigo,
  metodo: ClassificacaoMetodo,
  confianca: number,
  regra: string,
): ClassificationResult {
  const cat = CATEGORY_BY_CODIGO.get(codigo)!;
  return {
    categoria_id: cat.id,
    categoria_codigo: cat.codigo,
    categoria_nome: cat.nome,
    classificacao_metodo: metodo,
    classificacao_confianca: confianca,
    regra,
  };
}

function hasAnySignal(input: ClassifierInput): boolean {
  return Boolean(
    input.tipoOriginal ||
      input.especieOriginal ||
      input.descricaoOriginal ||
      input.marcaOriginal ||
      input.modeloOriginal ||
      input.cilindradas ||
      input.eixos ||
      input.lugares ||
      input.pesoBrutoKg,
  );
}

// Roda as palavras-chave (já em ordem de prioridade) contra um texto
// normalizado. Retorna a categoria da primeira regra que bater.
function classifyText(text: string): { codigo: CategoriaCodigo; keyword: string } | null {
  for (const rule of KEYWORD_RULES) {
    const hit = containsAny(text, rule.keywords);
    if (hit) return { codigo: rule.codigo, keyword: hit };
  }
  return null;
}

function classifyByModel(marca: string, modelo: string): CategoriaCodigo | null {
  const text = `${marca} ${modelo}`;
  for (const rule of MODEL_RULES) {
    if (containsAny(text, rule.models)) return rule.codigo;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 5. classificarVeiculo() — função central (spec §39–§40)
// ---------------------------------------------------------------------------

// Hierarquia das fontes (spec §28), na ordem em que são tentadas:
//   1. tipo_original          → TIPO_API,       confiança 100
//   2. especie_original       → ESPECIE_API,    confiança 95
//   3. descricao_original     → DESCRICAO_API,  confiança 90
//   4. marca + modelo         → MARCA_MODELO,   confiança 80
//   5. dedução técnica        → DEDUCAO,        confiança 70
//   6. OUTRO (havia dado, nenhuma regra bateu) → confiança 20
//   7. NAO_IDENTIFICADO (sem dado nenhum)       → confiança 0
//
// Importante (spec §38): a fonte explícita da API sempre vence a dedução por
// marca/modelo — MARCA_MODELO só é tentado quando tipo/espécie/descrição não
// bateram em nenhuma regra.
export function classificarVeiculo(input: ClassifierInput): ClassificationResult {
  const tipoNorm = normalizeText(input.tipoOriginal);
  const especieNorm = normalizeText(input.especieOriginal);
  const descricaoNorm = normalizeText(input.descricaoOriginal);
  const marcaNorm = normalizeText(input.marcaOriginal);
  const modeloNorm = normalizeText(input.modeloOriginal);

  // 1. Tipo explícito da API.
  if (tipoNorm) {
    const hit = classifyText(tipoNorm);
    if (hit) {
      return buildResult(hit.codigo, "TIPO_API", 100, `tipo:${hit.keyword}`);
    }
  }

  // 2. Espécie/categoria oficial da API.
  if (especieNorm) {
    const hit = classifyText(especieNorm);
    if (hit) {
      return buildResult(hit.codigo, "ESPECIE_API", 95, `especie:${hit.keyword}`);
    }
  }

  // 3. Descrição livre do veículo.
  if (descricaoNorm) {
    const hit = classifyText(descricaoNorm);
    if (hit) {
      return buildResult(hit.codigo, "DESCRICAO_API", 90, `descricao:${hit.keyword}`);
    }
  }

  // 4. Marca + modelo (só quando tipo/espécie/descrição não decidiram nada —
  //    nunca sobrepõe um tipo que a API já informou, spec §38).
  if (marcaNorm || modeloNorm) {
    const modelHit = classifyByModel(marcaNorm, modeloNorm);
    if (modelHit) {
      return buildResult(modelHit, "MARCA_MODELO", 80, `modelo:${modeloNorm || marcaNorm}`);
    }
  }

  // 5. Dedução por características técnicas (eixos, peso, lugares, cilindrada).
  const deduced = deduceFromSpecs(input);
  if (deduced) {
    return buildResult(deduced, "DEDUCAO", 70, "deducao:especificacoes");
  }

  // 6. Havia algum dado (tipo/espécie/descrição/marca/modelo/specs), mas
  //    nenhuma regra conseguiu classificar → OUTRO.
  if (hasAnySignal(input)) {
    return buildResult("OUTRO", "FALLBACK", 20, "fallback:sem_regra");
  }

  // 7. Nenhum dado disponível.
  return buildResult("NAO_IDENTIFICADO", "NAO_IDENTIFICADO", 0, "fallback:sem_dados");
}

// ---------------------------------------------------------------------------
// 6. Ponto único de entrada pra quem persiste um veículo (spec §35–§39)
// ---------------------------------------------------------------------------

function pickRaw(raw: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!raw) return null;
  for (const key of keys) {
    const value = raw[key];
    if (value != null && value !== "") return String(value);
  }
  return null;
}

function pickRawNumber(raw: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!raw) return null;
  const value = raw[key];
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export type VehicleClassificationRecord = ClassificationResult & {
  tipo_original: string | null;
  descricao_original: string | null;
  marca_original: string | null;
  modelo_original: string | null;
};

// Usada por todo write path (cadastro manual, quick-add, API v1) — recebe o
// JSON bruto da APIBrasil quando disponível (a fonte mais confiável) e, como
// fallback, o que o usuário/API informou à mão (type/brand/model). Sempre
// retorna tanto o resultado da classificação quanto os campos *_original a
// preservar junto do registro (spec §3, §36) — nunca sobrescreve o dado
// original de quem chama, só devolve o que deve ser gravado.
export function classifyForVehicleRecord(params: {
  raw?: Record<string, unknown> | null;
  /** Enum interno curto (car/motorcycle/truck/...), usado só quando não há `raw`. */
  type?: string | null;
  brand?: string | null;
  model?: string | null;
}): VehicleClassificationRecord {
  const { raw, type, brand, model } = params;

  const tipoOriginal = pickRaw(raw, ["tipo_veiculo"]) ?? typeEnumToKeyword(type);
  const marcaOriginal = pickRaw(raw, ["marca", "fabricante"]) ?? (brand || null);
  const modeloOriginal = pickRaw(raw, ["modelo"]) ?? (model || null);

  const result = classificarVeiculo({
    tipoOriginal,
    especieOriginal: pickRaw(raw, ["especie"]),
    descricaoOriginal: pickRaw(raw, ["versao", "motor_descricao"]),
    marcaOriginal,
    modeloOriginal,
    cilindradas: pickRawNumber(raw, "cilindradas"),
    eixos: pickRawNumber(raw, "quantidade_eixo"),
    lugares: pickRawNumber(raw, "quantidade_lugares"),
    pesoBrutoKg: pickRawNumber(raw, "peso_bruto_total"),
  });

  return {
    ...result,
    tipo_original: tipoOriginal,
    descricao_original: pickRaw(raw, ["versao", "motor_descricao"]),
    marca_original: marcaOriginal,
    modelo_original: modeloOriginal,
  };
}
