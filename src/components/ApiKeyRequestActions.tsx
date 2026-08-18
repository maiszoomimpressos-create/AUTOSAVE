"use client";

import { useState, useTransition } from "react";
import { approveApiKeyRequest, rejectApiKeyRequest } from "@/app/(app)/api-docs/actions";

export default function ApiKeyRequestActions({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"approve" | "reject" | null>(null);

  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setAction("approve");
          startTransition(() => approveApiKeyRequest(id));
        }}
        className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {pending && action === "approve" ? "..." : "Aprovar"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setAction("reject");
          startTransition(() => rejectApiKeyRequest(id));
        }}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        {pending && action === "reject" ? "..." : "Recusar"}
      </button>
    </div>
  );
}
