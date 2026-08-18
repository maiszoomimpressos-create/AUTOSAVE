import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESOURCES, type ResourceKey } from "@/lib/resources";
import { listCustomFieldDefinitions, toFieldDefs } from "@/lib/custom-fields";
import RequestApiKeyForm from "@/components/RequestApiKeyForm";
import ApiKeyRevealBanner from "@/components/ApiKeyRevealBanner";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "Em análise", className: "text-ink-muted" },
  approved: { text: "Aprovado", className: "text-green-700" },
  rejected: { text: "Recusado", className: "text-red-600" },
};

export default async function PortalPedirApiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const admin = createAdminClient();

  const customFieldsByResource: Partial<Record<ResourceKey, ReturnType<typeof toFieldDefs>>> = {};
  for (const resourceKey of Object.keys(RESOURCES) as ResourceKey[]) {
    const defs = await listCustomFieldDefinitions(workspaceId, resourceKey);
    if (defs.length > 0) {
      customFieldsByResource[resourceKey] = toFieldDefs(defs);
    }
  }

  const { data: requests } = await admin
    .from("api_key_requests")
    .select("id, resource, requested_fields, reason, status, raw_key_pending, created_at")
    .eq("requested_by", user?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Pedir API</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Peça acesso a um tipo de dado e a quais campos você precisa. Um
          administrador revisa antes da chave ser gerada.
        </p>
      </div>

      {requests
        ?.filter((r) => r.status === "approved" && r.raw_key_pending)
        .map((r) => (
          <ApiKeyRevealBanner key={r.id} requestId={r.id} rawKey={r.raw_key_pending!} />
        ))}

      <RequestApiKeyForm customFieldsByResource={customFieldsByResource} />

      <div className="overflow-x-auto rounded-xl border border-line bg-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Campos</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests && requests.length > 0 ? (
              requests.map((r) => {
                const resourceKey = r.resource as ResourceKey;
                const status = STATUS_LABEL[r.status] ?? { text: r.status, className: "" };
                return (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">
                      {RESOURCES[resourceKey]?.label ?? r.resource}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {r.requested_fields.length} campo(s)
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{r.reason ?? "-"}</td>
                    <td className={`px-4 py-3 ${status.className}`}>{status.text}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                  Nenhum pedido ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
