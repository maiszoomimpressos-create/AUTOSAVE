import { createAdminClient } from "@/lib/supabase/admin";
import { RESOURCES } from "@/lib/resources";
import { listCustomFieldDefinitions } from "@/lib/custom-fields";
import VehicleQuickAddForm from "@/components/VehicleQuickAddForm";
import FilterableTable from "@/components/FilterableTable";

const BASE_COLUMNS = RESOURCES.vehicles.fields.map((f) => ({ key: f.field, label: f.label }));

export default async function VeiculosPage() {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const supabase = createAdminClient();

  const [{ data: vehicles, error }, customFields] = await Promise.all([
    supabase
      .from("vehicles")
      .select(["id", ...BASE_COLUMNS.map((c) => c.key), "custom_fields"].join(","))
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    listCustomFieldDefinitions(workspaceId, "vehicles"),
  ]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        Erro ao carregar os veículos: {error.message}
      </div>
    );
  }

  const rawRows = (vehicles ?? []) as unknown as Array<
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
        <h1 className="text-xl font-semibold text-ink">Veículos</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {rows.length} veículo(s) cadastrado(s). Campos novos enviados pela API
          (ex: Tipo7) aparecem aqui automaticamente.
        </p>
      </div>

      <VehicleQuickAddForm />

      <FilterableTable
        columns={columns}
        rows={rows}
        defaultVisible={["plate", "brand", "model", "year", "color", "status"]}
        emptyMessage="Nenhum veículo cadastrado ainda."
      />
    </div>
  );
}
