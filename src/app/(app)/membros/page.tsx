import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberRole } from "@/lib/workspace";
import { canManageMembers, ASSIGNABLE_ROLES } from "@/lib/roles";
import MemberAddForm from "@/components/MemberAddForm";
import MemberStatusButton from "@/components/MemberStatusButton";

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ASSIGNABLE_ROLES.map((r) => [r.value, r.label]),
);
ROLE_LABELS.owner = "Dono";

export default async function MembrosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getMemberRole(user.id) : null;

  if (!canManageMembers(role)) {
    return (
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Membros</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Só donos e administradores podem gerenciar quem tem acesso a este
          workspace.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("workspace_members")
    .select("id, user_id, role, status, created_at")
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .order("created_at", { ascending: true });

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emailById = new Map(usersData?.users.map((u) => [u.id, u.email]) ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Membros</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quem tem conta criada mas não está aqui não consegue entrar no sistema.
        </p>
      </div>

      <MemberAddForm />

      <div className="overflow-x-auto rounded-xl border border-line bg-elevated">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {members && members.length > 0 ? (
              members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {emailById.get(m.user_id) ?? m.user_id}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "active" ? (
                      <span className="text-green-700">Ativo</span>
                    ) : m.status === "suspended" ? (
                      <span className="text-red-600">Suspenso</span>
                    ) : (
                      <span className="text-ink-muted">Convidado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.role !== "owner" && (
                      <MemberStatusButton id={m.id} status={m.status} />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-muted">
                  Nenhum membro ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
