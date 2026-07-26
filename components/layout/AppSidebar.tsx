"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  DollarSign, 
  X
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface AppSidebarProps {
  role?: "ADMIN" | "TEACHER" | "STUDENT";
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const adminNavItems: NavItem[] = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Usuários", href: "/admin/users", icon: Users },
  { name: "Turmas", href: "/admin/classes", icon: GraduationCap },
  { name: "Planos de Ensino", href: "/admin/plans", icon: BookOpen },
  { name: "Financeiro", href: "/admin/finance", icon: DollarSign },
];

export function AppSidebar({ role = "ADMIN", mobileOpen = false, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();
  const navItems = adminNavItems;

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
        <Link href="/admin" className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-indigo-600">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-extrabold shadow-sm">
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

      {/* Role Badge */}
      <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Painel</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase">
          {role}
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Support */}
      <div className="p-4 border-t border-slate-200">
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
          <p className="font-semibold text-slate-800 text-xs mb-1">Precisa de ajuda?</p>
          <p className="text-slate-500 text-xs mb-2">Acesse os guias administrativos da escola.</p>
          <a href="#" className="text-indigo-600 font-medium text-xs hover:underline flex items-center gap-1">
            Ver documentação →
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 hidden md:flex shrink-0 z-20 h-screen sticky top-0">
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
