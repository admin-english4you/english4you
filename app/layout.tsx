import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "English4You",
  description: "Plataforma de aulas de inglês da English4You — aulas ao vivo, materiais e prática com IA.",
  appleWebApp: {
    // O Next emite isto como `<meta name="mobile-web-app-capable">` (o nome
    // padronizado), e NÃO como o `apple-mobile-web-app-capable` legado. Quem
    // coloca o app em tela cheia no iPhone hoje é o `display: "standalone"`
    // do manifest, suportado desde o iOS 16.4.
    capable: true,
    title: "English4You",
    statusBarStyle: "black-translucent",
  },
  icons: {
    // Ícones OPACOS, de `public/ios/`, e não o `/apple-icon.png` (que tem os
    // cantos transparentes): o iOS não suporta alfa no ícone da tela inicial —
    // ele compõe o transparente sobre PRETO, e o ícone sai com moldura preta
    // ou simplesmente sumindo contra o fundo. O iOS também não escolhe o
    // arquivo pelo manifest; é desta lista que ele tira o ícone.
    apple: [
      { url: "/ios/180.png", sizes: "180x180", type: "image/png" },
      { url: "/ios/167.png", sizes: "167x167", type: "image/png" },
      { url: "/ios/152.png", sizes: "152x152", type: "image/png" },
      { url: "/ios/120.png", sizes: "120x120", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#04215d",
  // `cover` é o que faz `env(safe-area-inset-*)` devolver valores reais em vez
  // de zero. Sem isso, no iOS o `statusBarStyle: "black-translucent"` acima
  // joga o conteúdo por baixo do relógio/bateria e o header fica ilegível —
  // ver o padding de área segura em `AppHeader`.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      // A interface inteira é em português. Declarar `en` aqui fazia o Chrome
      // no Android tratar a página como inglesa e TRADUZIR tudo pro português
      // automaticamente — inclusive o conteúdo das atividades, que é o que o
      // aluno tem que aprender: "a teacher" virava "um professor", "They are
      // students" virava "Eles são estudantes", e o exercício perdia o sentido.
      // O conteúdo em inglês de dentro das atividades é protegido à parte com
      // `translate="no"` (ver os cards em student/practice).
      lang="pt-BR"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
