"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Filter, Download, Mail, MoreVertical, Search, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Role } from "@/modules/user/user.types";
import { createUserByAdminAction } from "@/modules/user/user.actions";

import { User } from "@/modules/user/user.types";

interface UsersListProps {
  initialUsers: User[];
}

export function UsersList({ initialUsers }: UsersListProps) {
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Form states
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("STUDENT");
  const [newUserPackage, setNewUserPackage] = useState("");

  const [usersList, setUsersList] = useState<User[]>(initialUsers);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormSuccessMessage(null);
    setFormErrorMessage(null);

    const result = await createUserByAdminAction({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      ...(newUserRole === 'STUDENT' && newUserPackage ? { packageId: newUserPackage } : {}),
    });

    setIsSubmitting(false);

    if (result.success && result.data) {
      const createdUser = result.data;
      
      setUsersList((prev) => [
        {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          status: "Active",
          avatarUrl: null,
          phone: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        ...prev,
      ]);

      setFormSuccessMessage(`Usuário ${createdUser.name} cadastrado com sucesso! Um e-mail de definição de senha foi enviado.`);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("STUDENT");
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccessMessage(null);
      }, 2500);
    } else if (!result.success) {
      setFormErrorMessage(result.error);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesRole = filterRole === "ALL" || u.role === filterRole;
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <AppLayout role="ADMIN">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Gestão de Usuários" 
          description="Gerencie alunos, professores e a equipe administrativa da escola."
        >
          <Button variant="outline" className="flex-1 sm:flex-initial">
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Usuário
          </Button>
        </PageHeader>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <button
              onClick={() => setFilterRole("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "ALL" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterRole("STUDENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "STUDENT" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Alunos
            </button>
            <button
              onClick={() => setFilterRole("TEACHER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "TEACHER" ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Professores
            </button>
            <button
              onClick={() => setFilterRole("ADMIN")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "ADMIN" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Admins
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Nome</th>
                  <th className="px-6 py-3.5">Perfil (Role)</th>
                  <th className="px-6 py-3.5">E-mail</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm
                          ${user.role === 'TEACHER' ? 'bg-amber-100 text-amber-800' : 
                            user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' : 
                            'bg-emerald-100 text-emerald-800'}`}>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        user.role === 'TEACHER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        <span className={`font-medium ${user.status === 'Active' ? 'text-slate-700' : 'text-slate-400'}`}>
                          {user.status === 'Active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>Exibindo {filteredUsers.length} de {usersList.length} usuários</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>Anterior</Button>
              <Button variant="outline" size="sm">Próximo</Button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Usuário"
      >

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {formSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccessMessage}</span>
                </div>
              )}

              {formErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  {formErrorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <Input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  E-mail do Usuário
                </label>
                <Input
                  type="email"
                  required
                  placeholder="carlos@exemplo.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="bg-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Um e-mail será enviado para este endereço com as instruções para criação da senha.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Perfil de Acesso (Role)
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => {
                    setNewUserRole(e.target.value as Role);
                    if (e.target.value !== 'STUDENT') setNewUserPackage("");
                  }}
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="STUDENT">STUDENT (Aluno)</option>
                  <option value="TEACHER">TEACHER (Professor)</option>
                  <option value="ADMIN">ADMIN (Administrador)</option>
                </select>
              </div>

              {newUserRole === "STUDENT" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pacote de Aulas
                  </label>
                  <select
                    value={newUserPackage}
                    onChange={(e) => setNewUserPackage(e.target.value)}
                    required
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="" disabled>Selecione um pacote...</option>
                    <option value="11111111-1111-1111-1111-111111111111">Pacote Básico (6 meses - R$ 150/mês)</option>
                    <option value="22222222-2222-2222-2222-222222222222">Pacote Pro (12 meses - R$ 120/mês)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    O contrato do aluno será criado automaticamente com base neste pacote.
                  </p>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cadastrando...
                    </>
                  ) : (
                    "Cadastrar e Enviar Convite"
                  )}
                </Button>
              </div>
            </form>
      </Modal>
    </AppLayout>
  );
}
