import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
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
        // Headers de segurança em todas as rotas.
        //
        // CSP: só as diretivas que NÃO restringem de onde vêm scripts/estilos/
        // imagens. Um `script-src` rígido exige nonce por requisição e quebra
        // fácil o Next (scripts inline), o Stream (vídeo/WebRTC), o Mercado
        // Pago e o Firebase — fica para um passo próprio, testado em
        // Report-Only. `frame-ancestors` é o que bloqueia clickjacking.
        //
        // Permissions-Policy: câmera, microfone e compartilhamento de tela
        // continuam liberados para o próprio site (aulas ao vivo); o resto sai.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), display-capture=(self), fullscreen=(self), geolocation=(), payment=(self), usb=(), bluetooth=()",
          },
        ],
      },
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
