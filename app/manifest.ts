import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "English4You",
    short_name: "English4You",
    description: "Plataforma de aulas de inglês da English4You — aulas ao vivo, materiais e prática com IA.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#07274f",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
