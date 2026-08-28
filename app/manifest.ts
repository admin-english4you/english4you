import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "English4You",
    short_name: "English4You",
    description: "Plataforma de aulas de inglês da English4You — aulas ao vivo, materiais e prática com IA.",
    // O `?pwa=1` é o que permite ao servidor saber que a visita veio do app
    // instalado, e não do navegador: quem abre pelo app nunca deve cair na
    // landing de marketing — vai direto pro login (ou pro hub, se já estiver
    // logado). Ver `app/page.tsx`.
    start_url: "/?pwa=1",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#04215d",
    lang: "pt-BR",
    icons: [
      {
        src: "/android/launchericon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/android/launchericon-72x72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/android/launchericon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/android/launchericon-144x144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/android/launchericon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android/launchericon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
