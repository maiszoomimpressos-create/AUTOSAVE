import { createAdminClient } from "@/lib/supabase/admin";
import { listCustomFieldDefinitions } from "@/lib/custom-fields";
import CustomerQuickAddForm from "@/components/CustomerQuickAddForm";
import CustomFieldsManager from "@/components/CustomFieldsManager";
import CustomerTypeFilter from "@/components/CustomerTypeFilter";

const BASE_COLUMNS: { key: string; label: string }[] = [
  { key: "customer_type", label: "Tipo" },
  { key: "full_name", label: "Nome / Razão social" },
  { key: "trade_name", label: "Nome fantasia" },
  { key: "email", label: "E-mail" },
  { key: "cpf", label: "CPF" },
  { key: "cnpj", label: "CNPJ" },
  { key: "phone", label: "Telefone" },
  { key: "rg", label: "RG" },
  { key: "birth_date", label: "Nascimento" },
  { key: "zip_code", label: "CEP" },
  { key: "street", label: "Rua" },
  { key: "street_number", label: "Número" },
  { key: "neighborhood", label: "Bairro" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "UF" },
  { key: "complement", label: "Complemento" },
  { key: "address_type", label: "Tipo de endereço" },
  { key: "external_id", label: "ID externo" },
];

export default async function CadastrosPage() {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const supabase = createAdminClient();

  const [{ data: customers }, customFields] = await Promise.all([
    supabase
      .from("customers")
      .select(
        [
          "id",
          ...BASE_COLUMNS.map((c) => c.key),
          "custom_fields",
          "created_at",
        ].join(","),
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    listCustomFieldDefinitions(workspaceId, "customers"),
  ]);

  const rawRows = (customers ?? []) as unknown as Array<
    Record<string, unknown> & { id: string; custom_fields: Record<string, unknown> | null }
  >;

  const columns = [
    ...BASE_COLUMNS,
    ...customFields.map((f) => ({ key: f.field_key, label: f.label })),
  ];

  const rows = rawRows.map((r) => ({ ...r, ...(r.custom_fields ?? {}) }));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Usuários</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {rows.length} pessoa(s) cadastrada(s). Alimentado pelo sistema de
          ingressos via API, ou adicionado manualmente aqui.
        </p>
      </div>

      <CustomFieldsManager fields={customFields} />

      <CustomerQuickAddForm />

      <CustomerTypeFilter
        columns={columns}
        rows={rows}
        defaultVisible={["customer_type", "full_name", "email", "cpf", "cnpj", "phone"]}
        emptyMessage="Nenhum cadastro ainda."
      />
    </div>
  );
}
