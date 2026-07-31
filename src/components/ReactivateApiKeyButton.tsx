"use client";

import { useTransition } from "react";
import { reactivateApiKey } from "@/app/(app)/api-docs/actions";

export default function ReactivateApiKeyButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Reativar esta chave? Ela volta a funcionar imediatamente.")) {
          startTransition(() => reactivateApiKey(id));
        }
      }}
      className="text-sm font-medium text-green-700 hover:underline disabled:opacity-50"
    >
      Reativar
    </button>
  );
}
