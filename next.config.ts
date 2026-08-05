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
};

export default nextConfig;
