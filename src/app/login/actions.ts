"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { deniedReason, getMembership, homeHrefFor } from "@/lib/workspace";

export type LoginFormState = {
  error?: string;
} | null;

export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  // Decide o destino aqui mesmo (em vez de sempre mandar pro /painel e
  // deixar o proxy corrigir depois) — evita o vai-e-volta que deixava a
  // barra de endereço e a tela dessincronizadas.
  const membership = await getMembership(data.user.id);

  if (!membership || membership.status !== "active") {
    await supabase.auth.signOut();
    redirect(`/login?denied=${deniedReason(membership?.status)}`);
  }

  redirect(homeHrefFor(membership.role));
}
