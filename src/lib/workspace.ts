import { createAdminClient } from "@/lib/supabase/admin";

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
