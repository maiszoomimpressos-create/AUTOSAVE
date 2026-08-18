"use client";

import { useState } from "react";
import CopyButton from "@/components/CopyButton";
import { acknowledgeKeyReveal } from "@/app/portal/actions";

export default function ApiKeyRevealBanner({
  requestId,
  rawKey,
}: {
  requestId: string;
  rawKey: string;
}) {
  const [hiding, setHiding] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-elevated p-6">
      <h3 className="font-medium text-ink">Sua chave foi aprovada</h3>
      <p className="text-sm text-ink-muted">Copie agora — ela não será mostrada novamente.</p>
      <div className="flex items-center gap-2 rounded-md bg-paper p-3">
        <code className="flex-1 break-all font-mono text-sm text-ink">{rawKey}</code>
        <CopyButton text={rawKey} />
      </div>
      <button
        type="button"
        disabled={hiding}
        onClick={async () => {
          setHiding(true);
          await acknowledgeKeyReveal(requestId);
        }}
        className="self-start rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper disabled:opacity-50"
      >
        {hiding ? "..." : "Já copiei, pode ocultar"}
      </button>
    </div>
  );
}
