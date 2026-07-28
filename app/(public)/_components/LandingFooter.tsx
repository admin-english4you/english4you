import Link from "next/link";
import { GraduationCap, Globe2 } from "lucide-react";

const platformLinks = [
  { label: "Como funciona", href: "#" },
  { label: "Aulas ao Vivo", href: "#" },
  { label: "Prática com IA", href: "#" },
  { label: "Preços", href: "#pricing" },
];
const companyLinks = [
  { label: "Sobre nós", href: "#" },
  { label: "Professores", href: "#" },
  { label: "Staff Login", href: "/staff/login" },
  { label: "Contato", href: "#" },
];
const legalLinks = [
  { label: "Política de Privacidade", href: "#" },
  { label: "Termos de Serviço", href: "#" },
  { label: "Política de Reembolso", href: "#" },
];

const TwitterIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export function LandingFooter() {
  return (
    <footer className="bg-[#07274f] text-slate-300 py-14 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#016ad1] to-[#38a5f8] flex items-center justify-center text-white">
              <GraduationCap size={19} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              English4You
            </span>
          </Link>
          <p className="text-sm leading-relaxed mb-6 max-w-xs text-slate-400">
            A plataforma premium de inglês para brasileiros. Combinando
            professores especialistas, espaços digitais interativos e tecnologia de IA.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#016ad1] hover:text-white transition-colors"
              aria-label="Twitter"
            >
              <TwitterIcon />
            </a>
            <a
              href="#"
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#016ad1] hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
          </div>
        </div>

        {/* Platform */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">Plataforma</h4>
          <ul className="space-y-3">
            {platformLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">Empresa</h4>
          <ul className="space-y-3">
            {companyLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-white font-bold text-sm mb-4">Termos</h4>
          <ul className="space-y-3">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-sm hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} English4You. Todos os direitos reservados.</p>
        <div className="flex items-center gap-1.5">
          <Globe2 size={14} />
          <span>São Paulo, Brasil</span>
        </div>
      </div>
    </footer>
  );
}
