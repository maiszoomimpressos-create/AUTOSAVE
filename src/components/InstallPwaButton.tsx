"use client";

import { useEffect, useState } from "react";
import ModalBackdrop from "@/components/ModalBackdrop";
import { DownloadIcon } from "@/components/icons";

// Não faz parte do TS DOM lib ainda — é um evento só do Chrome/Edge/Android.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "other";

// Guarda que o usuário já instalou nesse navegador/dispositivo. Precisa
// disso além do matchMedia porque, depois de instalado, a pessoa pode voltar
// a abrir o link em uma aba normal (favorito, e-mail, digitando a URL) em
// vez de pelo ícone da tela inicial — nesse caso a aba não está em modo
// standalone, mas o app já está instalado, e sem esse flag o botão voltava a
// aparecer como se nada tivesse sido instalado.
const INSTALLED_STORAGE_KEY = "autosave-pwa-installed";

// Nem todo PWA instalado abre em display-mode "standalone" — Windows e
// alguns Android relatam "window-controls-overlay" ou "minimal-ui" — por
// isso checa os três em vez de só o standalone.
const STANDALONE_DISPLAY_MODES = ["standalone", "window-controls-overlay", "minimal-ui"];

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const matchesDisplayMode = STANDALONE_DISPLAY_MODES.some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches,
  );
  return (
    matchesDisplayMode ||
    nav.standalone === true ||
    document.referrer.startsWith("android-app://") ||
    localStorage.getItem(INSTALLED_STORAGE_KEY) === "true"
  );
}

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "other";
}

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true); // começa "escondido" até checar no client
  const [platform, setPlatform] = useState<Platform>("other");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setPlatform(detectPlatform());

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
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

  // Diferente da versão anterior, o botão NÃO some quando o navegador ainda
  // não disparou o prompt nativo (isso é comum e pode nunca acontecer em
  // vários navegadores/Androids) — em vez disso, cai no passo a passo manual.
  if (installed) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return;
    }
    setShowHelp(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Instalar app"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-accent px-2.5 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-strong"
      >
        <DownloadIcon />
        <span>Instalar app</span>
      </button>

      {showHelp && (
        <ModalBackdrop onClose={() => setShowHelp(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-line bg-elevated p-6 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-ink">Instalar o AutoSave</h3>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-sm text-ink-muted hover:text-ink"
              >
                Fechar
              </button>
            </div>

            {platform === "ios" ? (
              <ol className="list-decimal space-y-2 pl-4 text-sm text-ink">
                <li>
                  Toque no ícone de compartilhar (<span aria-hidden>⬆️</span>) na barra do
                  Safari.
                </li>
                <li>
                  Escolha <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                </li>
                <li>
                  Toque em <strong>&quot;Adicionar&quot;</strong> no canto superior.
                </li>
              </ol>
            ) : (
              <ol className="list-decimal space-y-2 pl-4 text-sm text-ink">
                <li>
                  Toque no menu do navegador (geralmente <strong>⋮</strong> no canto superior
                  direito).
                </li>
                <li>
                  Escolha <strong>&quot;Instalar aplicativo&quot;</strong> ou{" "}
                  <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                </li>
                <li>
                  Confirme tocando em <strong>&quot;Instalar&quot;</strong> ou{" "}
                  <strong>&quot;Adicionar&quot;</strong>.
                </li>
              </ol>
            )}

            <p className="text-xs text-ink-muted">
              Não achou a opção? Alguns navegadores dentro de outros apps (Instagram,
              WhatsApp, Facebook) não deixam instalar — abra o link no Chrome ou Safari
              direto.
            </p>
          </div>
        </ModalBackdrop>
      )}
    </>
  );
}
