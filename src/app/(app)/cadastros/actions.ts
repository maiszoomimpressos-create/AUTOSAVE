"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeCpf, normalizeCnpj, normalizeEmail } from "@/lib/customers-api";
import { slugifyFieldKey } from "@/lib/custom-fields";
import { canManageMembers } from "@/lib/roles";
import { getMemberRole } from "@/lib/workspace";
import { notifyWebhooks } from "@/lib/webhooks";

export type CustomerFormState = { error?: string } | null;
export type CustomFieldFormState = { error: string } | { ok: true } | null;

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const customerType = formData.get("customer_type") === "pj" ? "pj" : "pf";
  const fullName = String(formData.get("full_name") ?? "").trim();
  const tradeName = String(formData.get("trade_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const cpf = String(formData.get("cpf") ?? "").trim();
  const cnpj = String(formData.get("cnpj") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    return { error: customerType === "pj" ? "Razão social é obrigatória." : "Nome é obrigatório." };
  }
  if (customerType === "pj" && !cnpj) {
    return { error: "CNPJ é obrigatório." };
  }

  const supabase = createAdminClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      workspace_id: workspaceId,
      external_id: `manual-${randomUUID()}`,
      customer_type: customerType,
      full_name: fullName,
      trade_name: customerType === "pj" && tradeName ? tradeName : null,
      email: email ? normalizeEmail(email) : null,
      cpf: customerType === "pf" && cpf ? normalizeCpf(cpf) : null,
      cnpj: customerType === "pj" && cnpj ? normalizeCnpj(cnpj) : null,
      phone: phone || null,
    })
    .select()
    .single();

  if (error) {
    const message =
      error.code === "23505"
        ? "CPF, CNPJ ou e-mail já cadastrado pra outro cliente."
        : error.message;
    return { error: message };
  }

  await notifyWebhooks({
    workspaceId,
    resource: "customers",
    event: "created",
    record: data,
  });

  revalidatePath("/cadastros");
  return null;
}

export async function addCustomField(
  _prevState: CustomFieldFormState,
  formData: FormData,
): Promise<CustomFieldFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado." };

  const role = await getMemberRole(user.id);
  if (!canManageMembers(role)) {
    return { error: "Só donos e administradores podem criar campos." };
  }

  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    return { error: "Dê um nome pro campo." };
  }

  const fieldKey = slugifyFieldKey(label);
  if (!fieldKey) {
    return { error: "Esse nome não gera uma chave de campo válida." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("custom_field_definitions").insert({
    workspace_id: process.env.DEFAULT_WORKSPACE_ID!,
    resource: "customers",
    field_key: fieldKey,
    label,
  });

  if (error) {
    const message =
      error.code === "23505" ? "Já existe um campo com esse nome." : error.message;
    return { error: message };
  }

  revalidatePath("/cadastros");
  revalidatePath("/api-docs");
  return { ok: true };
}
