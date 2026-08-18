"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isStrongPassword, PASSWORD_HINT, PASSWORD_PATTERN } from "@/lib/password";
import PasswordRequirements from "@/components/PasswordRequirements";

export default function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);

    if (!isStrongPassword(password)) {
      setError(
        "A senha deve ter pelo menos 6 caracteres, com letra maiúscula, minúscula, número e caractere especial.",
      );
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setOk(true);
    setPassword("");
    setConfirm("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-line bg-elevated p-6"
    >
      <h2 className="font-medium text-ink">Trocar senha</h2>

      <input
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        pattern={PASSWORD_PATTERN}
        title={PASSWORD_HINT}
        autoComplete="new-password"
        className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        type="password"
        placeholder="Confirmar nova senha"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
        className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <PasswordRequirements password={password} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-700">✓ Senha atualizada.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
