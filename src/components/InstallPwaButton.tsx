"use client";

import { useEffect, useState } from "react";
import ModalBackdrop from "@/components/ModalBackdrop";
import { DownloadIcon } from "@/components/icons";

// Não faz parte do TS DOM lib ainda — é um evento só do Chrome/Edge/Android.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true); // começa "escondido" até checar no client
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferredPrompt && !ios)) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    // iOS Safari não tem prompt programático — só instrui o passo a passo.
    setShowIosHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Instalar o app no celular"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-2.5 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-strong sm:px-3"
      >
        <DownloadIcon />
        <span className="hidden sm:inline">Instalar app</span>
      </button>

      {showIosHelp && (
        <ModalBackdrop onClose={() => setShowIosHelp(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-line bg-elevated p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-ink">Instalar o AutoSave</h3>
              <button
                type="button"
                onClick={() => setShowIosHelp(false)}
                className="text-sm text-ink-muted hover:text-ink"
              >
                Fechar
              </button>
            </div>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-ink">
              <li>
                Toque no ícone de compartilhar (
                <span aria-hidden>⬆️</span>) na barra do Safari.
              </li>
              <li>
                Escolha <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
              </li>
              <li>
                Toque em <strong>&quot;Adicionar&quot;</strong> no canto superior.
              </li>
            </ol>
          </div>
        </ModalBackdrop>
      )}
    </>
  );
}
