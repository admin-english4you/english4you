"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

/**
 * As props de identidade (`userName`, `userAvatarUrl`, ...) saíram daqui: o
 * header lê o usuário do `SessionProvider`, preenchido no servidor. Passá-las
 * por prop obrigava cada página a repetir a mesma informação — e quem esquecia
 * caía nos defaults de exemplo, que era exatamente a origem do flash.
 */
interface AppLayoutProps {
  children: React.ReactNode;
  role?: "ADMIN" | "TEACHER" | "STUDENT";
}

export function AppLayout({ children, role = "ADMIN" }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar (Desktop & Mobile Drawer) */}
      <AppSidebar 
        role={role} 
        mobileOpen={mobileOpen} 
        onCloseMobile={() => setMobileOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <AppHeader onOpenMobileMenu={() => setMobileOpen(true)} role={role} />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
