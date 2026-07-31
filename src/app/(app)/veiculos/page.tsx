import { createAdminClient } from "@/lib/supabase/admin";
import { RESOURCES } from "@/lib/resources";
import VehicleQuickAddForm from "@/components/VehicleQuickAddForm";
import FilterableTable from "@/components/FilterableTable";

const COLUMNS = RESOURCES.vehicles.fields.map((f) => ({ key: f.field, label: f.label }));

export default async function VeiculosPage() {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const supabase = createAdminClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select(["id", ...COLUMNS.map((c) => c.key)].join(","))
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const rows = (vehicles ?? []) as unknown as Array<
    Record<string, unknown> & { id: string }
  >;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Veículos</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {rows.length} veículo(s) cadastrado(s).
        </p>
      </div>

      <VehicleQuickAddForm />

      <FilterableTable
        columns={COLUMNS}
        rows={rows}
        defaultVisible={["plate", "brand", "model", "year", "color", "status"]}
        emptyMessage="Nenhum veículo cadastrado ainda."
      />
    </div>
  );
}
