import { createAdminClient } from "@/lib/supabase/admin";
import type { FieldDef } from "@/lib/resources";

export function slugifyFieldKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export type CustomFieldDefinition = {
  id: string;
  workspace_id: string;
  resource: string;
  field_key: string;
  label: string;
  created_at: string;
};

export async function listCustomFieldDefinitions(
  workspaceId: string,
  resource: string,
): Promise<CustomFieldDefinition[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("resource", resource)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export function toFieldDefs(defs: CustomFieldDefinition[]): FieldDef[] {
  return defs.map((d) => ({ field: d.field_key, label: d.label }));
}

const VALID_KEY = /^[a-z][a-z0-9_]{0,63}$/;

export function isValidIncomingFieldKey(key: string): boolean {
  return VALID_KEY.test(key);
}

export function humanizeFieldKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function ensureFieldDefinitions(
  workspaceId: string,
  resource: string,
  keys: string[],
): Promise<void> {
  if (keys.length === 0) return;

  const supabase = createAdminClient();
  const rows = keys.map((key) => ({
    workspace_id: workspaceId,
    resource,
    field_key: key,
    label: humanizeFieldKey(key),
  }));

  // on_conflict + ignoreDuplicates: only inserts keys that don't exist yet.
  await supabase
    .from("custom_field_definitions")
    .upsert(rows, { onConflict: "workspace_id,resource,field_key", ignoreDuplicates: true });
}
