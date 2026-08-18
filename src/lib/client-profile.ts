import { createAdminClient } from "@/lib/supabase/admin";

export type ClientProfileType = "pf" | "pj";

export type ClientProfile = {
  user_id: string;
  workspace_id: string;
  type: ClientProfileType;
  full_name: string;
  trade_name: string;
  document: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

export async function getClientProfile(userId: string): Promise<ClientProfile | null> {
  if (!userId) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("client_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data ?? null;
}

// Busca vários perfis de uma vez (tela de admin, uma linha por pedido) —
// evita N chamadas quando é só pra exibir tipo/documento ao lado do pedido.
export async function getClientProfilesByUserIds(
  userIds: string[],
): Promise<Map<string, ClientProfile>> {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("client_profiles")
    .select("*")
    .in("user_id", uniqueIds);

  return new Map((data ?? []).map((p) => [p.user_id, p as ClientProfile]));
}

// "Completo" = nome/razão social + CPF/CNPJ + telefone preenchidos — o
// mínimo pra identificar o cliente e vincular os pedidos de API a um
// perfil PF ou PJ.
export function isClientProfileComplete(profile: ClientProfile | null): boolean {
  return !!profile && !!profile.full_name.trim() && !!profile.document.trim() && !!profile.phone.trim();
}

export const CLIENT_PROFILE_NAME_LABEL: Record<ClientProfileType, string> = {
  pf: "Nome completo",
  pj: "Razão social",
};

export const CLIENT_PROFILE_DOCUMENT_LABEL: Record<ClientProfileType, string> = {
  pf: "CPF",
  pj: "CNPJ",
};
