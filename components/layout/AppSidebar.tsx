"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  DollarSign,
  FileText,
  Home,
  Sparkles,
  X
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

type SidebarRole = "ADMIN" | "TEACHER" | "STUDENT";

interface AppSidebarProps {
  role?: SidebarRole;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const adminNavItems: NavItem[] = [
  { name: "Início", href: "/admin", icon: LayoutDashboard },
  { name: "Usuários", href: "/admin/users", icon: Users },
  { name: "Turmas", href: "/admin/classes", icon: GraduationCap },
  { name: "Planos de Ensino", href: "/admin/plans", icon: BookOpen },
  { name: "Financeiro", href: "/admin/finance", icon: DollarSign },
];

const teacherNavItems: NavItem[] = [
  { name: "Início", href: "/teacher", icon: LayoutDashboard },
  { name: "Turmas", href: "/teacher/classes", icon: GraduationCap },
  { name: "Lições", href: "/teacher/lessons", icon: BookOpen },
];

const studentNavItems: NavItem[] = [
  { name: "Início", href: "/student", icon: Home },
  { name: "Turma", href: "/student/classes", icon: GraduationCap },
  { name: "Prática", href: "/student/practice", icon: Sparkles },
  // Por último: são administrativos, não de uso diário.
  { name: "Pagamentos", href: "/student/payments", icon: DollarSign },
  { name: "Documentos", href: "/student/documents", icon: FileText },
];

const NAV_BY_ROLE: Record<SidebarRole, NavItem[]> = {
  ADMIN: adminNavItems,
  TEACHER: teacherNavItems,
  STUDENT: studentNavItems,
};

const HOME_BY_ROLE: Record<SidebarRole, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export function AppSidebar({ role = "ADMIN", mobileOpen = false, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = NAV_BY_ROLE[role];
  const homeHref = HOME_BY_ROLE[role];

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
        <Link href={homeHref} className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-primary">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold shadow-sm">
            E4
          </div>
          <span>English4You</span>
        </Link>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          // A home do papel só é ativa em match exato; as demais casam por prefixo
          // para que subrotas (ex: /student/classes/[recordId]) mantenham o item aceso.
          const isActive = pathname === item.href || (item.href !== homeHref && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
                isActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Support — a documentação existe apenas no hub administrativo */}
      {role === "ADMIN" && (
        <div className="p-4 border-t border-slate-200">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <p className="font-semibold text-slate-800 text-xs mb-1">Precisa de ajuda?</p>
            <p className="text-slate-500 text-xs mb-2">Acesse os guias administrativos da escola.</p>
            <Link href="/admin/docs" onClick={onCloseMobile} className="text-primary font-medium text-xs hover:underline flex items-center gap-1">
              Ver documentação →
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex shrink-0 z-20 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <aside 
        className={`fixed top-0 left-0 bottom-0 w-64 z-50 md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </aside>
    </>
  );
}
