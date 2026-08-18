"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registro é best-effort — se falhar, o app continua funcionando
      // normalmente, só sem os ganhos de PWA (instalar/offline).
    });
  }, []);

  return null;
}
