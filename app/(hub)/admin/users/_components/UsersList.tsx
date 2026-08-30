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
import { applyScholarshipDiscount, formatCents } from "@/modules/finance/finance.utils";

interface UsersListProps {
  initialUsers: User[];
  /** Pacotes ativos — o contrato do aluno é gerado a partir do escolhido aqui. */
  packages: Package[];
  /**
   * Menor data aceita para adiar a primeira cobrança (amanhã), calculada no
   * SERVIDOR. Ler o relógio aqui seria impuro durante o render, e o relógio que
   * vale é o do servidor — é ele que valida o campo depois.
   */
  minFirstChargeDay: string;
}

export function UsersList({ initialUsers, packages, minFirstChargeDay }: UsersListProps) {
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
  // Bolsa: "NONE" | "FULL" | "PARTIAL". Estado separado do percentual para que
  // trocar de opção não perca o número já digitado.
  const [scholarshipType, setScholarshipType] = useState<"NONE" | "FULL" | "PARTIAL">("NONE");
  const [scholarshipPercentInput, setScholarshipPercentInput] = useState("50");
  const [billingMode, setBillingMode] = useState<"MERCADO_PAGO" | "MANUAL">("MERCADO_PAGO");
  const [skipFirstCharge, setSkipFirstCharge] = useState(false);
  const [firstChargeDay, setFirstChargeDay] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const selectedPackage = packages.find((p) => p.id === newUserPackage) ?? null;
  const parsedPercent = Number.parseInt(scholarshipPercentInput, 10);
  const scholarshipPercent =
    scholarshipType === "FULL" ? 100 : scholarshipType === "PARTIAL" ? parsedPercent : 0;
  // Bolsa integral não tem o que cobrar — o modo é forçado, não escolhido.
  const effectiveBillingMode = scholarshipPercent === 100 ? "MANUAL" : billingMode;
  // Só vale para quem a plataforma cobra; bolsa integral e cobrança manual não
  // têm cobrança para adiar.
  const adiaPrimeiraCobranca =
    effectiveBillingMode === "MERCADO_PAGO" && skipFirstCharge && Boolean(firstChargeDay);
  const previewMonthlyCents =
    selectedPackage && Number.isFinite(scholarshipPercent)
      ? applyScholarshipDiscount(selectedPackage.installmentValueCents, scholarshipPercent)
      : null;

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
    if (scholarshipType === "PARTIAL" && (!Number.isFinite(parsedPercent) || parsedPercent < 1 || parsedPercent > 99)) {
      setFormErrorMessage("O percentual da bolsa deve ser um número entre 1 e 99.");
      return;
    }
    if (skipFirstCharge && !firstChargeDay) {
      setFormErrorMessage("Informe a data da primeira cobrança.");
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
      scholarshipPercent: newUserRole === 'STUDENT' ? scholarshipPercent : 0,
      billingMode: newUserRole === 'STUDENT' ? effectiveBillingMode : 'MERCADO_PAGO',
      ...(newUserRole === 'STUDENT' && adiaPrimeiraCobranca
        ? { firstChargeDay }
        : {}),
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
      setScholarshipType("NONE");
      setScholarshipPercentInput("50");
      setBillingMode("MERCADO_PAGO");
      setSkipFirstCharge(false);
      setFirstChargeDay("");
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
                          {selectedPackage?.name ?? "—"}
                        </span>
                      </div>
                    )}
                    {newUserRole === "STUDENT" && scholarshipType !== "NONE" && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Bolsa</span>
                        <span className="text-sm font-semibold text-emerald-700">
                          {scholarshipPercent === 100
                            ? "Integral (100%)"
                            : `Parcial (${scholarshipPercent}%)`}
                        </span>
                      </div>
                    )}
                    {/* Mostrado sempre que houver desvio do padrão — bolsa OU
                        cobrança manual —, porque as duas coisas mudam o que o
                        aluno vai pagar e por onde. */}
                    {newUserRole === "STUDENT" &&
                      (scholarshipType !== "NONE" || effectiveBillingMode === "MANUAL") && (
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Mensalidade</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {previewMonthlyCents !== null ? `${formatCents(previewMonthlyCents)}/mês` : "—"}
                            {" · "}
                            {effectiveBillingMode === "MANUAL" ? "Controle manual" : "Mercado Pago"}
                          </span>
                        </div>
                      )}
                    {newUserRole === "STUDENT" && adiaPrimeiraCobranca && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Primeira cobrança</span>
                        <span className="text-sm font-semibold text-amber-700">
                          Adiada para {new Date(`${firstChargeDay}T12:00:00`).toLocaleDateString("pt-BR")}
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
                        if (val !== 'STUDENT') {
                          setNewUserPackage("");
                          // Bolsa é termo de matrícula de aluno — professor e
                          // admin não têm pacote nem contrato de bolsa.
                          setScholarshipType("NONE");
                          setBillingMode("MERCADO_PAGO");
                        }
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

                  {newUserRole === "STUDENT" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Bolsa de Estudos
                        </label>
                        <Select
                          value={scholarshipType}
                          onChange={(val) => {
                            const next = val as "NONE" | "FULL" | "PARTIAL";
                            setScholarshipType(next);
                            // Integral não tem cobrança; o seletor abaixo some.
                            if (next === "FULL") setBillingMode("MANUAL");
                          }}
                          options={[
                            { value: "NONE", label: "Sem bolsa — paga o pacote cheio" },
                            { value: "FULL", label: "Bolsa integral — não paga nada" },
                            { value: "PARTIAL", label: "Bolsa parcial — desconto percentual" },
                          ]}
                        />
                      </div>

                      {scholarshipType === "PARTIAL" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Percentual da bolsa (%)
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            value={scholarshipPercentInput}
                            onChange={(e) => setScholarshipPercentInput(e.target.value)}
                            placeholder="50"
                          />
                        </div>
                      )}

                      {/* Aparece também SEM bolsa: um aluno que já estuda na
                          escola e paga por fora precisa nascer em cobrança
                          manual. Escondê-lo aqui obrigaria a criar no Mercado
                          Pago e trocar na ficha depois — o que reemite o
                          contrato e manda dois e-mails ao aluno. */}
                      {scholarshipType !== "FULL" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Como cobrar a mensalidade
                          </label>
                          <Select
                            value={billingMode}
                            onChange={(val) => setBillingMode(val as "MERCADO_PAGO" | "MANUAL")}
                            options={[
                              { value: "MERCADO_PAGO", label: "Assinatura no Mercado Pago (automática)" },
                              { value: "MANUAL", label: "Controle manual — a escola registra no caixa" },
                            ]}
                          />
                          {billingMode === "MANUAL" && (
                            <p className="mt-1 text-[11px] text-slate-500">
                              O aluno <strong>não passa pelo checkout</strong>: assinar o contrato já
                              libera o acesso. Use para quem já estuda na escola ou paga por fora.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Só para quem a plataforma cobra: adiar a estreia da
                          cobrança é o que permite migrar um aluno que já pagou
                          o mês por fora sem cobrá-lo de novo. */}
                      {scholarshipType !== "FULL" && billingMode === "MERCADO_PAGO" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Primeira cobrança
                          </label>
                          <Select
                            value={skipFirstCharge ? "SKIP" : "NOW"}
                            onChange={(val) => setSkipFirstCharge(val === "SKIP")}
                            options={[
                              { value: "NOW", label: "Ao cadastrar o cartão (padrão)" },
                              { value: "SKIP", label: "Pular a primeira — cobrar a partir de uma data" },
                            ]}
                          />
                          {skipFirstCharge && (
                            <>
                              <Input
                                type="date"
                                className="mt-2"
                                min={minFirstChargeDay}
                                value={firstChargeDay}
                                onChange={(e) => setFirstChargeDay(e.target.value)}
                              />
                              <p className="mt-1 text-[11px] text-slate-500">
                                O aluno cadastra o cartão agora, mas a{" "}
                                <strong>primeira cobrança só acontece nessa data</strong>. Use quando
                                a mensalidade deste mês já foi paga por fora.
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {scholarshipType !== "NONE" && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-900">
                          {selectedPackage && previewMonthlyCents !== null ? (
                            <>
                              O aluno pagará{" "}
                              <strong>{formatCents(previewMonthlyCents)}/mês</strong>
                              {scholarshipPercent < 100 && (
                                <>
                                  {" "}
                                  em vez de {formatCents(selectedPackage.installmentValueCents)}
                                </>
                              )}
                              .{" "}
                              {effectiveBillingMode === "MANUAL"
                                ? "A plataforma não fará cobranças — a escola registra os recebimentos no caixa."
                                : "A cobrança recorrente será criada no Mercado Pago com este valor."}
                            </>
                          ) : (
                            "Selecione um pacote para ver o valor com a bolsa aplicada."
                          )}
                          <span className="mt-1 block text-emerald-800">
                            O contrato sairá do modelo do tipo <strong>Bolsista</strong> — ele
                            precisa estar ativo em{" "}
                            <Link href="/admin/finance?tab=modelos" className="font-semibold underline">
                              Financeiro → Modelos
                            </Link>
                            .
                          </span>
                        </div>
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
