"use client";

import { useTransition } from "react";
import { deleteApiKey } from "@/app/(app)/api-docs/actions";

export default function DeleteApiKeyButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir esta chave permanentemente? Não dá pra desfazer.")) {
          startTransition(() => deleteApiKey(id));
        }
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Excluir
    </button>
  );
}
