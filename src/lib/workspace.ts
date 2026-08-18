import { createAdminClient } from "@/lib/supabase/admin";
import { isExternalClient } from "@/lib/roles";

export async function getMemberRole(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return data?.role ?? null;
}

export type Membership = { role: string; status: string };

// Igual getMemberRole, mas sem filtrar por status — usado nos pontos que
// precisam saber POR QUE alguém não tem acesso (convidado esperando
// aprovação, suspenso, ou nunca teve pedido nenhum).
export async function getMembership(userId: string): Promise<Membership | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("role, status")
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}

// Mapeia o status pro parâmetro ?denied= usado pelo /login pra mostrar a
// mensagem certa. Fica num lugar só pra proxy.ts e as actions nunca saírem
// de sincronia sobre o que cada status significa.
export function deniedReason(status: string | null | undefined): "pending" | "suspended" | "1" {
  if (status === "invited") return "pending";
  if (status === "suspended") return "suspended";
  return "1";
}

export function homeHrefFor(role: string): string {
  return isExternalClient(role) ? "/portal" : "/painel";
}
