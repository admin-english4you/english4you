import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Padrão do Next.js é 1MB — pequeno demais para upload de áudio/vídeo
      // de lições via Server Action (ver modules/lesson/lesson.actions.ts).
      bodySizeLimit: "150mb",
    },
  },
  async headers() {
    return [
      {
        // Sem isso, navegadores podem cachear o service worker por até 24h
        // mesmo com a checagem de atualização automática do browser — uma
        // correção nele (ver public/sw.js) demoraria pra chegar nos clientes.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
