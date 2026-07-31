"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageMembers } from "@/lib/roles";
import { getMemberRole } from "@/lib/workspace";

export type AddMemberFormState = { error?: string } | null;

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const role = await getMemberRole(user.id);
  if (!canManageMembers(role)) throw new Error("Sem permissão.");

  return user;
}

export async function addMember(
  _prevState: AddMemberFormState,
  formData: FormData,
): Promise<AddMemberFormState> {
  const currentUser = await requireManager();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer");

  if (!email) {
    return { error: "Informe o e-mail." };
  }

  const admin = createAdminClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  // Supabase Admin API has no "get user by email" lookup, so we page through users.
  let targetUserId: string | null = null;
  for (let page = 1; page <= 20 && !targetUserId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { error: error.message };
    const match = data.users.find((u) => u.email?.toLowerCase() === email);
    if (match) targetUserId = match.id;
    if (data.users.length < 200) break;
  }

  if (!targetUserId) {
    return {
      error:
        "Esse e-mail ainda não tem conta. Peça pra pessoa criar em /cadastro primeiro, depois adicione aqui.",
    };
  }

  const { data: existing } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("workspace_members")
      .update({ status: "active", role })
      .eq("id", existing.id);
  } else {
    await admin.from("workspace_members").insert({
      workspace_id: workspaceId,
      user_id: targetUserId,
      role,
      status: "active",
      invited_by: currentUser.id,
    });
  }

  revalidatePath("/membros");
  return null;
}

export async function suspendMember(memberId: string) {
  await requireManager();

  const admin = createAdminClient();
  await admin
    .from("workspace_members")
    .update({ status: "suspended" })
    .eq("id", memberId);

  revalidatePath("/membros");
}

export async function reactivateMember(memberId: string) {
  await requireManager();

  const admin = createAdminClient();
  await admin
    .from("workspace_members")
    .update({ status: "active" })
    .eq("id", memberId);

  revalidatePath("/membros");
}
