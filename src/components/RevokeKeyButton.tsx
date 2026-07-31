"use client";

import { useTransition } from "react";
import { revokeApiKey } from "@/app/(app)/api-docs/actions";

export default function RevokeKeyButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Revogar esta chave? Ela para de funcionar imediatamente.")) {
          startTransition(() => revokeApiKey(id));
        }
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      Revogar
    </button>
  );
}
