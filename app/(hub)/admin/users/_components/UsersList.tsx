"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Filter, Download, Mail, ChevronRight, Search, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, TablePagination } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/components/ui/toaster";
import { Role } from "@/modules/user/user.types";
import { createUserByAdminAction } from "@/modules/user/user.actions";
import Image from "next/image";
import Link from "next/link";

import { User } from "@/modules/user/user.types";
import type { Package } from "@/modules/finance/finance.types";
import { formatCents } from "@/modules/finance/finance.utils";

interface UsersListProps {
  initialUsers: User[];
  /** Pacotes ativos — o contrato do aluno é gerado a partir do escolhido aqui. */
  packages: Package[];
}

export function UsersList({ initialUsers, packages }: UsersListProps) {
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
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [usersList, setUsersList] = useState<User[]>(initialUsers);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMessage(null);

    // Validações básicas antes de exibir a tela de confirmação
    if (!newUserName.trim()) {
      setFormErrorMessage("Nome completo é obrigatório.");
      return;
    }
    if (!newUserEmail.trim()) {
      setFormErrorMessage("Endereço de e-mail é obrigatório.");
      return;
    }
    if (newUserRole === "STUDENT" && !newUserPackage) {
      setFormErrorMessage("Selecione um pacote de aulas para o aluno.");
      return;
    }

    // Se estiver tudo preenchido corretamente, mostra a tela de confirmação
    setShowConfirmation(true);
  };

  const executeCreateUser = async () => {
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
      
      // Espalha o usuário que voltou do servidor em vez de remontar o objeto
      // campo a campo: um literal completo quebra o build a cada coluna nova
      // em `users` (foi o que aconteceu ao adicionar CPF/endereço).
      setUsersList((prev) => [createdUser, ...prev]);

      setFormSuccessMessage(`Usuário ${createdUser.name} cadastrado com sucesso! Um e-mail de definição de senha foi enviado.`);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserRole("STUDENT");
      setNewUserPackage("");
      setShowConfirmation(false);
      
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccessMessage(null);
      }, 2500);
    } else if (!result.success) {
      setFormErrorMessage(result.error);
      setShowConfirmation(false); // Retorna para edição se der erro
    }
  };

  const handleShareInstallLink = async () => {
    const link = `${window.location.origin}/instalar`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado! Envie por WhatsApp ou e-mail para o aluno instalar o app.");
    } catch {
      toast.error("Não foi possível copiar o link. Copie manualmente: " + link);
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
      <div className="mx-auto space-y-6">
        <PageHeader 
          title="Gestão de Usuários" 
          description="Gerencie alunos, professores e a equipe administrativa da escola."
        >
          <Button variant="outline" className="flex-1 sm:flex-initial" onClick={handleShareInstallLink}>
            <Share2 className="w-4 h-4 mr-2" /> Link do App
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-initial">
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial bg-primary hover:bg-primary/80"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Usuário
          </Button>
        </PageHeader>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filtrar:
            </span>
            <button
              onClick={() => setFilterRole("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterRole === "ALL" ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-600 hover:bg-slate-100"
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
                filterRole === "ADMIN" ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-600 hover:bg-slate-100"
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
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil (Role)</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell isHeaderCell>
                  <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm relative overflow-hidden shrink-0
                      ${user.role === 'TEACHER' ? 'bg-amber-100 text-amber-800' :
                        user.role === 'ADMIN' ? 'bg-primary/20 text-primary' :
                        'bg-emerald-100 text-emerald-800'}`}>
                      {user.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.name} fill sizes="36px" className="object-cover" />
                      ) : (
                        user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                        {user.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium md:text-xs">{user.id}</div>
                    </div>
                  </Link>
                </TableCell>
                
                <TableCell mobileLabel="Perfil">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                    user.role === 'TEACHER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    user.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {user.role}
                  </span>
                </TableCell>

                <TableCell mobileLabel="E-mail" className="text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                  <span>{user.email}</span>
                </TableCell>

                <TableCell mobileLabel="Status">
                  <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className={`font-medium ${user.status === 'Active' ? 'text-slate-700' : 'text-slate-400'}`}>
                    {user.status === 'Active' ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>

                <TableCell mobileLabel="Ações" className="md:justify-end" hideBorderMobile>
                  {/* Link em vez do menu de três pontos, que nunca abriu nada:
                      a ficha do usuário é o destino de toda ação individual
                      (dados pessoais, contratos, financeiro, desativar). */}
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-primary/20 hover:bg-primary/10 hover:text-primary"
                  >
                    Ver ficha <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination
          totalItems={usersList.length}
          currentItemsCount={filteredUsers.length}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setShowConfirmation(false);
        }}
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

              {showConfirmation ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                    <h3 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">Confirmar Dados</h3>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Nome Completo</span>
                      <span className="text-sm font-semibold text-slate-800">{newUserName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">E-mail</span>
                      <span className="text-sm font-semibold text-slate-800">{newUserEmail}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Perfil de Acesso</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {newUserRole === "STUDENT" ? "Aluno" : newUserRole === "TEACHER" ? "Professor" : "Administrador"}
                      </span>
                    </div>
                    {newUserRole === "STUDENT" && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Pacote de Aulas</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {packages.find((p) => p.id === newUserPackage)?.name ?? "—"}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    Importante: Ao confirmar, um e-mail de ativação será enviado automaticamente para o endereço cadastrado.
                  </p>

                  <Modal.Footer>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowConfirmation(false)}
                      disabled={isSubmitting}
                    >
                      Voltar e Editar
                    </Button>
                    <Button
                      type="button"
                      onClick={executeCreateUser}
                      loading={isSubmitting}
                      className="bg-primary hover:bg-primary/80 text-primary-foreground"
                    >
                      {isSubmitting ? "Cadastrando..." : "Confirmar e Criar"}
                    </Button>
                  </Modal.Footer>
                </div>
              ) : (
                <>
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
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Um e-mail será enviado para este endereço com as instruções para criação da senha.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Perfil de Acesso
                    </label>
                    <Select
                      value={newUserRole}
                      onChange={(val) => {
                        setNewUserRole(val as Role);
                        if (val !== 'STUDENT') setNewUserPackage("");
                      }}
                      options={[
                        { value: "STUDENT", label: "Aluno" },
                        { value: "TEACHER", label: "Professor" },
                        { value: "ADMIN", label: "Administrador" }
                      ]}
                    />
                  </div>

                  {newUserRole === "STUDENT" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Pacote de Aulas
                      </label>
                      {packages.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
                          Nenhum pacote ativo cadastrado. Crie um em{" "}
                          <Link href="/admin/finance?tab=pacotes" className="font-semibold underline">
                            Financeiro → Pacotes
                          </Link>{" "}
                          antes de matricular alunos.
                        </div>
                      ) : (
                        <>
                          <Select
                            value={newUserPackage}
                            onChange={(val) => setNewUserPackage(val)}
                            placeholder="Selecione um pacote..."
                            options={packages.map((p) => ({
                              value: p.id,
                              label: `${p.name} (${p.durationInMonths} meses · ${p.classesPerWeek}x/sem · ${formatCents(p.installmentValueCents)}/mês)`,
                            }))}
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            O contrato do aluno é criado automaticamente com base neste pacote.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  <Modal.Footer>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/80 text-primary-foreground"
                    >
                      Cadastrar e Enviar Convite
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </form>
      </Modal>
    </AppLayout>
  );
}
