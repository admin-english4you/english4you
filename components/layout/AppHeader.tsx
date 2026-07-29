"use client";

import { Menu, Search, Bell, LogOut, Settings, User as UserIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getMeAction, logoutAction } from "@/modules/user/user.actions";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";

interface AppHeaderProps {
  onOpenMobileMenu?: () => void;
  userName?: string;
  userRoleTitle?: string;
  userAvatarText?: string;
  userAvatarUrl?: string | null;
}

export function AppHeader({
  onOpenMobileMenu,
  userName = "Sarah Jenkins",
  userRoleTitle = "Diretora Escolar",
  userAvatarText = "SJ",
  userAvatarUrl = null,
}: AppHeaderProps) {
  const [localUserName, setLocalUserName] = useState(userName);
  const [localUserRoleTitle, setLocalUserRoleTitle] = useState(userRoleTitle);
  const [localUserAvatarText, setLocalUserAvatarText] = useState(userAvatarText);
  const [localUserAvatarUrl, setLocalUserAvatarUrl] = useState<string | null>(userAvatarUrl);
  const [profilePath, setProfilePath] = useState<string>("/student/profile");
  const router = useRouter();

  const [prevUserAvatarUrl, setPrevUserAvatarUrl] = useState(userAvatarUrl);
  if (userAvatarUrl !== prevUserAvatarUrl) {
    setPrevUserAvatarUrl(userAvatarUrl);
    setLocalUserAvatarUrl(userAvatarUrl);
  }

  useEffect(() => {
    getMeAction().then(user => {
      if (user) {
        setLocalUserName(user.name);
        setLocalUserRoleTitle(
          user.role === "ADMIN" ? "Administrador" : 
          user.role === "TEACHER" ? "Professor(a)" : "Aluno(a)"
        );
        const initials = user.name
          .split(" ")
          .map(n => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();
        setLocalUserAvatarText(initials);
        setLocalUserAvatarUrl(user.avatarUrl || null);
        setProfilePath(`/${user.role.toLowerCase()}/profile`);
      }
    });
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 sticky top-0">
      {/* Mobile Toggle & Brand */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg text-indigo-600">E4Y Admin</span>
      </div>

      {/* Global Search Bar */}
      <div className="hidden md:flex items-center relative w-80 lg:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar alunos, turmas ou professores..."
          className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-lg text-sm focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
        />
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <button 
          className="relative text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        <Dropdown 
          trigger={
            <div className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center ring-2 ring-white text-xs group-hover:ring-indigo-200 transition-all shadow-sm overflow-hidden relative">
                {localUserAvatarUrl ? (
                  <Image src={localUserAvatarUrl} alt={localUserName} fill sizes="36px" className="object-cover" />
                ) : (
                  localUserAvatarText
                )}
              </div>
              <div className="hidden sm:block text-left text-sm">
                <p className="font-semibold text-slate-800 leading-none mb-1 group-hover:text-indigo-600 transition-colors">
                  {localUserName}
                </p>
                <p className="text-xs text-slate-500 leading-none">{localUserRoleTitle}</p>
              </div>
            </div>
          }
        >
          <DropdownItem onClick={() => router.push(profilePath)}>
            <UserIcon className="w-4 h-4 mr-3 text-slate-400 group-hover:text-indigo-500" />
            Meu Perfil
          </DropdownItem>
          <DropdownItem>
            <Settings className="w-4 h-4 mr-3 text-slate-400 group-hover:text-indigo-500" />
            Configurações
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={() => logoutAction()} destructive>
            <LogOut className="w-4 h-4 mr-3 text-rose-500" />
            Sair
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
