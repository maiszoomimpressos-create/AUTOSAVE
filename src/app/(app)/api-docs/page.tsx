import { createAdminClient } from "@/lib/supabase/admin";
import { RESOURCES, type ResourceKey } from "@/lib/resources";
import { listCustomFieldDefinitions, toFieldDefs } from "@/lib/custom-fields";
import ApiKeyForm from "@/components/ApiKeyForm";
import RevokeKeyButton from "@/components/RevokeKeyButton";
import ReactivateApiKeyButton from "@/components/ReactivateApiKeyButton";
import DeleteApiKeyButton from "@/components/DeleteApiKeyButton";
import EditApiKeyFieldsForm from "@/components/EditApiKeyFieldsForm";
import ApiDocsTabs from "@/components/ApiDocsTabs";
import PlateLookupReportPanel from "@/components/PlateLookupReportPanel";
import ApiKeyRequestActions from "@/components/ApiKeyRequestActions";
import { getPlateLookupReport } from "@/lib/plate-lookup-report";
import { getClientProfilesByUserIds, CLIENT_PROFILE_DOCUMENT_LABEL } from "@/lib/client-profile";

const codeBlock =
  "block rounded-md bg-paper p-3 text-xs whitespace-pre-wrap break-all font-mono text-ink";

export default async function ApiDocsPage() {
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const supabase = createAdminClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select(
      "id, name, resource, allowed_fields, key_prefix, webhook_url, created_at, revoked_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const customFieldsByResource: Partial<Record<ResourceKey, ReturnType<typeof toFieldDefs>>> = {};
  for (const resourceKey of Object.keys(RESOURCES) as ResourceKey[]) {
    const defs = await listCustomFieldDefinitions(workspaceId, resourceKey);
    if (defs.length > 0) {
      customFieldsByResource[resourceKey] = toFieldDefs(defs);
    }
  }

  const plateLookupReport = await getPlateLookupReport();

  const { data: apiKeyRequests } = await supabase
    .from("api_key_requests")
    .select("id, requested_by, resource, requested_fields, reason, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(usersData?.users.map((u) => [u.id, u.email]) ?? []);

  const clientProfileById = await getClientProfilesByUserIds(
    (apiKeyRequests ?? []).map((r) => r.requested_by),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">API</h1>
      </div>

      <ApiDocsTabs
        fornecemos={
          <>
      <ApiKeyForm customFieldsByResource={customFieldsByResource} />

      <div className="overflow-x-auto rounded-xl border border-line bg-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Chave</th>
              <th className="px-4 py-3 font-medium">Campos</th>
              <th className="px-4 py-3 font-medium">Webhook</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {keys && keys.length > 0 ? (
              keys.map((k) => {
                const resourceKey = k.resource as ResourceKey;
                const fields = [
                  ...RESOURCES[resourceKey].fields,
                  ...(customFieldsByResource[resourceKey] ?? []),
                ];
                return (
                <tr key={k.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{k.name}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {RESOURCES[resourceKey]?.label ?? k.resource}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                    {k.key_prefix}…
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    <div className="flex flex-col items-start gap-1.5">
                      <span>{k.allowed_fields.length} campo(s)</span>
                      {!k.revoked_at && (
                        <EditApiKeyFieldsForm
                          id={k.id}
                          resource={k.resource}
                          fields={fields}
                          allowedFields={k.allowed_fields}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {k.webhook_url ? "Ativo" : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {k.revoked_at ? (
                      <span className="text-red-600">Revogada</span>
                    ) : (
                      <span className="text-green-700">Ativa</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!k.revoked_at ? (
                      <RevokeKeyButton id={k.id} />
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <ReactivateApiKeyButton id={k.id} />
                        <DeleteApiKeyButton id={k.id} />
                      </div>
                    )}
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                  Nenhuma chave criada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
        <h2 className="font-medium text-ink">Buscar veículo por placa</h2>
        <code className={codeBlock}>{`GET /api/v1/vehicles?plate=ABC1234
x-api-key: <chave>

→ { "found": true, "vehicles": [ { ...apenas os campos marcados na chave } ] }`}</code>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
        <h2 className="font-medium text-ink">Criar ou atualizar veículo</h2>
        <code className={codeBlock}>{`POST /api/v1/vehicles
x-api-key: <chave>
Content-Type: application/json

{
  "plate": "ABC1234",
  "brand": "Fiat",
  "model": "Strada",
  "color": "Branco"
}

→ { "vehicle": { ... }, "created": true }`}</code>
        <p className="text-xs text-ink-muted">
          O cadastro aceita qualquer campo enviado (não é limitado pelos campos
          marcados na chave — essa marcação controla só o que é <em>devolvido</em>{" "}
          nas buscas). Se a placa já existir, atualiza só os campos enviados e
          retorna <code>created: false</code> — sem duplicar registros.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
        <h2 className="font-medium text-ink">Buscar cliente (por external_id, cpf, cnpj ou e-mail)</h2>
        <code className={codeBlock}>{`GET /api/v1/customers?external_id=<uuid-do-tipo7>
GET /api/v1/customers?cpf=12345678900
GET /api/v1/customers?cnpj=12345678000199
GET /api/v1/customers?email=fulano@exemplo.com
x-api-key: <chave>

→ { "found": true, "customer": { ...apenas os campos marcados na chave } }`}</code>
        <p className="text-xs text-ink-muted">
          Qualquer um dos quatro acha o mesmo registro, se ele já tiver esse
          dado salvo. Pessoa física usa <code>cpf</code>, pessoa jurídica usa{" "}
          <code>cnpj</code> — o campo <code>customer_type</code> (
          <code>pf</code>/<code>pj</code>) diz qual é qual.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
        <h2 className="font-medium text-ink">Criar ou atualizar cliente</h2>
        <code className={codeBlock}>{`POST /api/v1/customers
x-api-key: <chave>
Content-Type: application/json

{
  "external_id": "uuid-do-tipo7",
  "full_name": "Fulano de Tal",
  "email": "fulano@exemplo.com",
  "cpf": "123.456.789-00",
  "phone": "46988212387"
}

→ { "customer": { ... }, "created": true }`}</code>
        <p className="text-xs text-ink-muted">
          Envie pelo menos um de <code>external_id</code>, <code>cpf</code> ou{" "}
          <code>email</code> — qualquer um encontra a mesma pessoa, mesmo que ela
          apareça primeiro só com CPF (ex: no ingresso) e depois complete a conta.
          Perfil pode ser preenchido aos poucos: manda só os campos que tiver, os
          outros continuam como estavam. CPF e e-mail são normalizados (CPF só
          números, e-mail em minúsculo) e não podem se repetir entre clientes
          diferentes.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
        <h2 className="font-medium text-ink">Webhooks — sermos avisados vs. avisar vocês</h2>
        <p className="text-sm text-ink-muted">
          Ao criar uma chave, você pode informar uma URL de webhook. Sempre que um
          registro desse tipo for criado ou atualizado — por API, pela tela, ou por
          qualquer outra chave — nós avisamos essa URL automaticamente.
        </p>
        <code className={codeBlock}>{`POST <sua-url-de-webhook>
Content-Type: application/json
X-Autosave-Signature: <hmac-sha256 do corpo, usando o segredo do webhook>

{
  "event": "created" | "updated",
  "resource": "customers",
  "data": { ...apenas os campos marcados na sua chave }
}`}</code>
        <p className="text-xs text-ink-muted">
          Verifiquem a assinatura calculando HMAC-SHA256 do corpo recebido com o
          segredo do webhook (mostrado uma vez na criação da chave) e comparando
          com o header <code>X-Autosave-Signature</code>. Entrega é melhor-esforço:
          se sua URL estiver fora do ar, a notificação é descartada (não
          re-tentamos), então continuem também consultando pela API normalmente.
        </p>
      </div>
          </>
        }
        puxamos={
          <>
          <PlateLookupReportPanel report={plateLookupReport} />
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
            <h2 className="font-medium text-ink">Busca de placa — APIBrasil</h2>
            <p className="text-sm text-ink-muted">
              Ao cadastrar um veículo pela placa, o app tenta preencher marca,
              modelo, ano e cor automaticamente antes de pedir pra digitar.
              Ordem de busca: 1) nossos veículos já cadastrados (grátis) → 2)
              cache de placas já consultadas antes (grátis, evita pagar duas
              vezes pela mesma placa) → 3) só então a APIBrasil, que é paga por
              chamada.
            </p>
            <code className={codeBlock}>{`POST https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits (interno)
Authorization: Bearer <APIBRASIL_BEARER_TOKEN>

{ "tipo": "agregados-propria", "placa": "ABC1D23", "homolog": false }`}</code>
            <p className="text-xs text-ink-muted">
              Sem credencial configurada, a busca simplesmente não encontra
              nada e o formulário segue funcionando com preenchimento manual.
              Existe uma trava de gasto diário (
              <code>PLATE_LOOKUP_DAILY_CAP</code>, padrão 50 chamadas/dia) —
              ao bater o teto, novas placas não cadastradas param de ser
              buscadas na API paga até o dia seguinte.{" "}
              <code>APIBRASIL_HOMOLOG=true</code> liga o modo de teste da
              APIBrasil (grátis, não conta no gasto nem no cache — sempre
              devolve o mesmo veículo de exemplo).
            </p>
          </div>
          </>
        }
        pedidos={
          <div className="overflow-x-auto rounded-xl border border-line bg-elevated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-muted">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Campos</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {apiKeyRequests && apiKeyRequests.length > 0 ? (
                  apiKeyRequests.map((r) => {
                    const resourceKey = r.resource as ResourceKey;
                    const clientProfile = clientProfileById.get(r.requested_by);
                    return (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">
                          {emailById.get(r.requested_by) ?? r.requested_by}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {clientProfile ? (
                            <span className="flex flex-col">
                              <span className="font-medium text-ink">
                                {clientProfile.type.toUpperCase()} — {clientProfile.full_name}
                              </span>
                              <span className="text-xs">
                                {CLIENT_PROFILE_DOCUMENT_LABEL[clientProfile.type]}:{" "}
                                {clientProfile.document}
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-600">Perfil incompleto</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {RESOURCES[resourceKey]?.label ?? r.resource}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {r.requested_fields.length} campo(s)
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{r.reason ?? "-"}</td>
                        <td className="px-4 py-3">
                          {r.status === "pending" && (
                            <span className="text-ink-muted">Em análise</span>
                          )}
                          {r.status === "approved" && (
                            <span className="text-green-700">Aprovado</span>
                          )}
                          {r.status === "rejected" && (
                            <span className="text-red-600">Recusado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === "pending" && <ApiKeyRequestActions id={r.id} />}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                      Nenhum pedido de cliente ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        }
      />
    </div>
  );
}
