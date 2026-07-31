"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type SignUpFormState = {
  error?: string;
  success?: boolean;
} | null;

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 6 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function translateAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "weak_password":
      return "Senha fraca. Use letra maiúscula, minúscula, número e símbolo.";
    case "email_address_invalid":
      return "Esse endereço de e-mail não é aceito.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com esse e-mail.";
    default:
      return fallback;
  }
}

export async function signUp(
  _prevState: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password) {
    return { error: "Preencha todos os campos." };
  }
  if (!isStrongPassword(password)) {
    return {
      error:
        "A senha deve ter pelo menos 6 caracteres, com letra maiúscula, minúscula, número e caractere especial.",
    };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { error: translateAuthError(error.code, error.message) };
  }

  if (data.session) {
    redirect("/");
  }

  return { success: true };
}
