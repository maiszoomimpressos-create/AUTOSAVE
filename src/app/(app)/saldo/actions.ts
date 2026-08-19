"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SaveBalanceAlertState = { error?: string; ok?: true } | null;

function parseNumber(raw: FormDataEntryValue | null): number {
  return Number(String(raw ?? "").trim().replace(",", "."));
}

export async function saveBalanceAlert(
  _prevState: SaveBalanceAlertState,
  formData: FormData,
): Promise<SaveBalanceAlertState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const thresholdType = String(formData.get("threshold_type") ?? "");
  if (thresholdType !== "fixed" && thresholdType !== "percent") {
    return { error: "Escolha R$ ou %." };
  }

  const thresholdValue = parseNumber(formData.get("threshold_value"));
  if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
    return { error: "Informe um valor de alerta válido." };
  }
  if (thresholdType === "percent" && thresholdValue > 100) {
    return { error: "O percentual não pode passar de 100%." };
  }

  let referenceValue: number | null = null;
  if (thresholdType === "percent") {
    referenceValue = parseNumber(formData.get("reference_value"));
    if (!Number.isFinite(referenceValue) || referenceValue <= 0) {
      return { error: "Informe a que valor esse percentual é referente." };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("balance_alert_settings").upsert(
    {
      workspace_id: process.env.DEFAULT_WORKSPACE_ID!,
      threshold_type: thresholdType,
      threshold_value: thresholdValue,
      reference_value: referenceValue,
      active: true,
      updated_by: user.id,
      // Zera a trava anti-spam a cada edição — sem isso, mudar o valor de
      // um alerta que já tinha disparado ficava preso "já avisei" pra
      // sempre, mesmo cruzando o novo limite, até o saldo se recuperar
      // acima dele (o que podia nunca acontecer).
      triggered_at: null,
    },
    { onConflict: "workspace_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/saldo");
  return { ok: true };
}

export async function disableBalanceAlert() {
  const admin = createAdminClient();
  await admin
    .from("balance_alert_settings")
    .update({ active: false })
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!);

  revalidatePath("/saldo");
}
