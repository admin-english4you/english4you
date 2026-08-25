"use client";

import { useState, useRef, useTransition } from "react";
import { User } from "../user.types";
import { updateAvatarAction } from "../user.actions";
import { Button } from "@/components/ui/button";
import { Camera, Mail, Shield, User as UserIcon, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { getInitials } from "@/components/ui/avatar";
import Image from "next/image";

interface ProfileEditorProps {
  user: User;
  /**
   * Conteúdo extra exibido ao lado do cartão de perfil (ex: o card de próxima
   * aula do aluno). Fica como slot para que cada hub componha o que precisa
   * sem duplicar o fluxo de upload de avatar.
   */
  aside?: React.ReactNode;
}

export function ProfileEditor({ user, aside }: ProfileEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = getInitials(user.name);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    const formData = new FormData();
    formData.append("avatar", file);

    startTransition(async () => {
      const result = await updateAvatarAction(formData);
      if (!result.success) {
        setError(result.error);
      }
      
      // Limpa o input de arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  const roleText =
    user.role === "ADMIN" ? "Administrador" :
    user.role === "TEACHER" ? "Professor(a)" : "Aluno(a)";

  return (
    // Sem `userAvatarUrl`: o header lê o avatar do SessionProvider, e o
    // `revalidatePath("/", "layout")` de `updateAvatarAction` já refaz o
    // layout do servidor com a foto nova.
    <AppLayout role={user.role}>
      <PageHeader
        title="Meu Perfil"
        description="Gerencie suas informações pessoais e foto de perfil."
        className="mb-3"
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-start gap-3 shadow-sm"
        >
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      <div className={aside ? "grid grid-cols-1 lg:grid-cols-3 gap-6 items-start" : undefined}>
      <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden${aside ? " lg:col-span-2" : ""}`}>
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-indigo-600 to-blue-500 w-full relative"></div>
        
        <div className="px-6 sm:px-10 pb-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 -mt-12 relative z-10">
            
            {/* Avatar Section */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-3xl shadow-xl ring-4 ring-white overflow-hidden relative">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.name} fill sizes="112px" className="object-cover" />
                ) : (
                  initials
                )}

                {/* Overlay Upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left mt-2 sm:mt-14 flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
              <p className="text-indigo-600 font-medium text-sm flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <Shield size={14} />
                {roleText}
              </p>
            </div>
            
            <div className="sm:mt-14">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                loading={isPending}
                className="rounded-full shadow-sm"
              >
                {!isPending && <Camera className="w-4 h-4 mr-2" />}
                {isPending ? "Enviando..." : "Trocar Foto"}
              </Button>
            </div>
          </div>

          <hr className="my-8 border-slate-100" />

          {/* Form Infos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nome Completo
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                <UserIcon size={18} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-800">{user.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Endereço de E-mail
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
                <Mail size={18} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-800">{user.email}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <p className="text-xs text-slate-400">
              Para alterar os dados, entre em contato com um administrador.
            </p>
          </div>
        </div>
      </div>

        {aside && <div className="lg:col-span-1 space-y-6">{aside}</div>}
      </div>
    </AppLayout>
  );
}
