"use client";

import { useRef } from "react";

// Fecha o modal só quando o clique COMEÇA e TERMINA no próprio fundo.
// Um onClick simples no fundo fecharia o modal também quando o usuário
// seleciona um texto dentro do modal (pra copiar, por exemplo) e solta o
// mouse fora da caixa — o navegador dispara o "click" no ancestral comum
// (o fundo) mesmo o mousedown tendo sido dentro do conteúdo.
export default function ModalBackdrop({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  const downOnBackdrop = useRef(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (downOnBackdrop.current && e.target === e.currentTarget) onClose();
        downOnBackdrop.current = false;
      }}
    >
      {children}
    </div>
  );
}
