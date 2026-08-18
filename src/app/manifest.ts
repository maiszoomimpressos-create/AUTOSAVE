import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoSave",
    short_name: "AutoSave",
    description:
      "Plataforma de cadastro e gestão de veículos, clientes e documentos com sincronização em nuvem.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c52b2",
    theme_color: "#0c52b2",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
