import type { Metadata } from "next";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  UserCircle,
  AlertTriangle,
  Info,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Documentação | English4You Admin",
  description: "Guia de uso do painel administrativo da English4You.",
};

const sections = [
  { id: "visao-geral", label: "Visão Geral", icon: Info },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "turmas", label: "Turmas", icon: GraduationCap },
  { id: "planos", label: "Planos de Ensino", icon: BookOpen },
  { id: "financeiro", label: "Financeiro", icon: DollarSign },
  { id: "perfil", label: "Meu Perfil", icon: UserCircle },
];

function InDevelopmentNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 font-medium leading-relaxed">{children}</p>
    </div>
  );
}

function DocSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 scroll-mt-24 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="font-bold text-slate-900 text-base">{title}</h2>
      </div>
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:text-sm [&_h3]:pt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_strong]:text-slate-800 [&_strong]:font-semibold [&_code]:bg-slate-100 [&_code]:text-slate-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
        {children}
      </div>
    </section>
  );
}

export default function AdminDocsPage() {
  return (
    <AppLayout role="ADMIN">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Documentação do Painel Administrativo"
          description="Guia de uso para a equipe administrativa: o que cada página faz e como usar cada funcionalidade."
        />

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
          {/* Table of Contents */}
          <nav className="lg:sticky lg:top-6 bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-1 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <p className="px-3 pt-1 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Nesta página
            </p>
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {section.label}
                </a>
              );
            })}
          </nav>

          {/* Content */}
          <div className="space-y-6 min-w-0">
            <DocSection id="visao-geral" title="Visão Geral" icon={Info}>
              <p>
                Este painel é usado pela <strong>equipe administrativa (Diretor/Coordenador)</strong> da English4You
                para gerenciar usuários, turmas, planos de ensino e o financeiro da escola. Existem três perfis de
                acesso na plataforma:
              </p>
              <ul>
                <li><strong>ADMIN</strong> — acesso total a este painel administrativo.</li>
                <li><strong>TEACHER</strong> — acessa o portal do professor (fora deste painel), onde dá aulas e vê suas turmas.</li>
                <li><strong>STUDENT</strong> — acessa o portal do aluno (fora deste painel), onde assiste aulas e pratica.</li>
              </ul>
              <p>
                O menu à esquerda dá acesso às páginas abaixo. Esta documentação está organizada na mesma ordem do
                menu — use o índice ao lado para pular direto para a seção que precisar.
              </p>
            </DocSection>

            <DocSection id="dashboard" title="Dashboard" icon={LayoutDashboard}>
              <p>
                Página inicial (<code>/admin</code>) com um resumo rápido da operação: receita do mês, alunos ativos,
                turmas ativas, contratos pendentes, atividades recentes e atalhos para os outros módulos.
              </p>
              <InDevelopmentNotice>
                Em desenvolvimento: os números e atividades desta página são dados de demonstração fixos — ainda não
                refletem os dados reais do banco. Os cards de estatística já linkam para as páginas correspondentes.
              </InDevelopmentNotice>
            </DocSection>

            <DocSection id="usuarios" title="Usuários" icon={Users}>
              <p>
                Em <code>/admin/users</code> você gerencia todas as contas da plataforma: alunos, professores e
                administradores.
              </p>
              <h3>Como cadastrar um novo usuário</h3>
              <ol>
                <li>Clique em <strong>&quot;Adicionar Usuário&quot;</strong>.</li>
                <li>Preencha nome completo e e-mail, e escolha o <strong>Perfil de Acesso</strong> (Aluno, Professor ou Administrador).</li>
                <li>Se o perfil for <strong>Aluno</strong>, selecione também o pacote de aulas contratado.</li>
                <li>Confirme os dados na tela de revisão e clique em <strong>&quot;Confirmar e Criar&quot;</strong>.</li>
              </ol>
              <p>
                Ao confirmar, a plataforma cria a conta e envia automaticamente um e-mail para o novo usuário definir
                sua senha de acesso — não é necessário definir uma senha manualmente.
              </p>
              <p>
                Use os filtros no topo da lista (<strong>Todos / Alunos / Professores / Admins</strong>) e a busca por
                nome ou e-mail para localizar um usuário rapidamente.
              </p>
              <InDevelopmentNotice>
                A vinculação automática do pacote escolhido a um contrato financeiro ainda não foi implementada — por
                enquanto o pacote é apenas registrado no cadastro do aluno.
              </InDevelopmentNotice>
            </DocSection>

            <DocSection id="turmas" title="Turmas" icon={GraduationCap}>
              <p>
                Em <code>/admin/classes</code> você cria e gerencia as turmas da escola: horários, professor
                responsável, plano de ensino, lista de alunos e a grade de aulas.
              </p>

              <h3>Criando uma turma</h3>
              <p>
                Clique em <strong>&quot;Criar Nova Turma&quot;</strong> e informe nome, nível e o horário semanal
                (adicione quantos dias/horários forem necessários — normalmente 2x por semana, mas você pode
                configurar qualquer frequência). A turma é criada imediatamente e aparece na lista antes mesmo da
                confirmação do servidor terminar. Professor e plano de ensino são definidos depois, na página de
                detalhes da turma.
              </p>

              <h3>Filtrando a lista de turmas</h3>
              <p>
                Use os filtros <strong>Ativas / Inativas / Arquivadas / Todas</strong> e a busca (por nome, nível ou
                professor) no topo da página. Por padrão, apenas turmas <strong>Ativas</strong> são exibidas.
              </p>

              <h3>Página de detalhes da turma</h3>
              <p>Clique em qualquer card para abrir a página da turma, onde você pode:</p>
              <ul>
                <li><strong>Atribuir/trocar o professor responsável</strong> pela turma.</li>
                <li>
                  <strong>Atribuir o plano de ensino</strong> — ao definir (ou trocar) o plano, a grade de aulas da
                  turma é gerada automaticamente, distribuindo as lições do plano, em ordem, pelos dias e horários
                  configurados. Trocar o plano depois apaga apenas as aulas ainda não realizadas e gera uma nova
                  grade a partir de hoje; aulas já concluídas nunca são apagadas.
                </li>
                <li>
                  <strong>Adicionar, remover e transferir alunos</strong> — cada turma tem um limite máximo de 12
                  alunos. Um aluno só pode estar em uma turma por vez: ao <strong>transferir</strong> um aluno para
                  outra turma, ele deixa de ver as aulas e materiais da turma antiga e passa a ver apenas os da nova
                  turma.
                </li>
                <li>
                  <strong>Ver as aulas da turma</strong> e, em qualquer aula específica, definir um{" "}
                  <strong>professor substituto</strong> — útil quando o professor titular precisa faltar. Isso não
                  altera o professor responsável pela turma, só aquela aula pontual.
                </li>
              </ul>

              <h3>Status da turma: Ativa, Inativa e Arquivada</h3>
              <ul>
                <li>
                  <strong>Ativa</strong> — funcionamento normal, todos os campos acima podem ser editados.
                </li>
                <li>
                  <strong>Inativa</strong> (botão &quot;Desativar Turma&quot;) — desvincula todos os alunos da turma
                  (eles ficam sem turma, prontos para entrar em uma nova) e bloqueia qualquer alteração na turma. A
                  partir daqui você pode <strong>Reativar</strong> (volta a ficar Ativa e editável — os alunos não
                  retornam automaticamente, é preciso adicioná-los de novo) ou <strong>Arquivar</strong>.
                </li>
                <li>
                  <strong>Arquivada</strong> (permanente) — a turma não é deletada, fica somente-leitura para sempre,
                  preservando o histórico de alunos, aulas e professores. Não é possível reativar uma turma
                  arquivada.
                </li>
              </ul>
            </DocSection>

            <DocSection id="planos" title="Planos de Ensino" icon={BookOpen}>
              <p>
                Em <code>/admin/plans</code> fica o editor de lições, onde é montado o currículo (plano de ensino)
                que depois é atribuído às turmas em <Link href="/admin/classes" className="text-indigo-600 hover:underline">Turmas</Link>.
              </p>
              <InDevelopmentNotice>
                Em desenvolvimento: esta tela ainda é um protótipo de interface, sem gravação real no banco de dados.
                Hoje, planos e lições só podem ser inseridos diretamente por um desenvolvedor. Assim que a
                persistência for implementada, esta seção será atualizada.
              </InDevelopmentNotice>
            </DocSection>

            <DocSection id="financeiro" title="Financeiro" icon={DollarSign}>
              <p>
                Em <code>/admin/finance</code> fica a visão de receitas, mensalidades e repasses a professores,
                integrada aos pagamentos via Mercado Pago.
              </p>
              <InDevelopmentNotice>
                Em desenvolvimento: esta tela ainda exibe dados de demonstração fixos. A geração de contratos a partir
                do pacote escolhido no cadastro do aluno e a integração de pagamentos com o Mercado Pago ainda estão
                sendo implementadas.
              </InDevelopmentNotice>
            </DocSection>

            <DocSection id="perfil" title="Meu Perfil" icon={UserCircle}>
              <p>
                Em <code>/admin/profile</code> você troca sua foto de perfil clicando no avatar ou em &quot;Trocar
                Foto&quot; (aceita PNG, JPEG ou WEBP, até 5MB). Nome e e-mail são somente leitura por aqui — para
                alterá-los, outro administrador precisa fazer a mudança diretamente no cadastro do usuário.
              </p>
            </DocSection>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
