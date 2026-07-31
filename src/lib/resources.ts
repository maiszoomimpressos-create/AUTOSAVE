export type FieldDef = { field: string; label: string };

export const RESOURCES = {
  vehicles: {
    label: "Veículos",
    fields: [
      { field: "plate", label: "Placa" },
      { field: "name", label: "Nome" },
      { field: "type", label: "Tipo" },
      { field: "brand", label: "Marca" },
      { field: "model", label: "Modelo" },
      { field: "year", label: "Ano" },
      { field: "color", label: "Cor" },
      { field: "status", label: "Status" },
      { field: "odometer_km", label: "Odômetro (km)" },
      { field: "fuel_type", label: "Combustível" },
      { field: "chassis_number", label: "Chassi" },
      { field: "renavam", label: "Renavam" },
      { field: "engine_number", label: "Número do motor" },
      { field: "owner_name", label: "Proprietário" },
      { field: "owner_document", label: "CPF/CNPJ do proprietário" },
      { field: "category", label: "Categoria" },
      { field: "species", label: "Espécie" },
      { field: "body_type", label: "Carroceria" },
      { field: "capacity", label: "Capacidade" },
      { field: "power_cv", label: "Potência (CV)" },
      { field: "displacement", label: "Cilindrada" },
      { field: "cmt", label: "CMT" },
      { field: "axles", label: "Nº de eixos" },
      { field: "city", label: "Município" },
      { field: "state", label: "UF" },
      { field: "licensing_year", label: "Exercício" },
      { field: "restrictions", label: "Restrições" },
      { field: "security_code", label: "Código de segurança (CLA)" },
      { field: "license_expiry", label: "Validade do licenciamento" },
    ] satisfies FieldDef[],
  },
  customers: {
    label: "Clientes",
    fields: [
      { field: "external_id", label: "ID externo (Tipo7)" },
      { field: "customer_type", label: "Tipo (PF/PJ)" },
      { field: "full_name", label: "Nome completo / Razão social" },
      { field: "trade_name", label: "Nome fantasia" },
      { field: "email", label: "E-mail" },
      { field: "cpf", label: "CPF" },
      { field: "cnpj", label: "CNPJ" },
      { field: "phone", label: "Telefone" },
      { field: "rg", label: "RG" },
      { field: "birth_date", label: "Data de nascimento" },
      { field: "zip_code", label: "CEP" },
      { field: "street", label: "Rua" },
      { field: "street_number", label: "Número" },
      { field: "neighborhood", label: "Bairro" },
      { field: "city", label: "Cidade" },
      { field: "state", label: "UF" },
      { field: "complement", label: "Complemento" },
      { field: "address_type", label: "Tipo de endereço (casa/apartamento)" },
    ] satisfies FieldDef[],
  },
} as const;

export type ResourceKey = keyof typeof RESOURCES;

export function isResourceKey(value: string): value is ResourceKey {
  return value in RESOURCES;
}
