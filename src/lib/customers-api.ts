export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export const CUSTOMER_FIELDS = [
  "external_id",
  "customer_type",
  "full_name",
  "trade_name",
  "email",
  "cpf",
  "cnpj",
  "phone",
  "rg",
  "birth_date",
  "zip_code",
  "street",
  "street_number",
  "neighborhood",
  "city",
  "state",
  "complement",
  "address_type",
] as const;
