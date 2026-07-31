"use client";

import { useTransition } from "react";
import { suspendMember, reactivateMember } from "@/app/(app)/membros/actions";

export default function MemberStatusButton({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const isActive = status === "active";

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const action = isActive ? suspendMember : reactivateMember;
        const confirmMsg = isActive
          ? "Suspender o acesso dessa pessoa?"
          : "Reativar o acesso dessa pessoa?";
        if (confirm(confirmMsg)) {
          startTransition(() => action(id));
        }
      }}
      className={`text-sm font-medium hover:underline disabled:opacity-50 ${
        isActive ? "text-red-600" : "text-green-700"
      }`}
    >
      {isActive ? "Suspender" : "Reativar"}
    </button>
  );
}
