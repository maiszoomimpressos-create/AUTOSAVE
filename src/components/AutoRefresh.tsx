"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Mantém as telas atualizadas sozinhas quando o dado muda em outro
// dispositivo/aba/usuário — sem isso, cada view só atualiza quando a
// própria aba faz uma ação (revalidatePath cobre isso, mas só localmente).
//
// `router.refresh()` só re-busca os Server Components da rota atual — não
// dá reload de página, não perde estado de formulário nem digitação em
// componentes client (marca/modelo em edição, por exemplo).
//
// Pausa quando a aba está em background (não desperdiça requisição à toa)
// e já atualiza na hora quando o usuário volta pra aba, além do intervalo
// normal.
export default function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, intervalMs]);

  return null;
}
