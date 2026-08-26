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
  BellRing,
  Download,
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
  { id: "notificacoes", label: "Lembretes de Estudo", icon: BellRing },
  { id: "instalar-app", label: "Instalar o App", icon: Download },
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
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
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
      <div className="mx-auto space-y-6">
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
                Página inicial (<code>/admin</code>) com um resumo da operação. Todos os números vêm do banco de
                dados em tempo real — nada aqui é fixo. Clicar em qualquer card leva à página correspondente.
              </p>

              <h3>Os quatro cards</h3>
              <ul>
                <li>
                  <strong>Entradas do mês</strong> — tudo que ENTROU no caixa no mês corrente: os lançamentos de
                  entrada que você marcou como recebidos em{" "}
                  <Link href="/admin/finance" className="text-primary hover:underline">Financeiro</Link> mais as
                  mensalidades efetivamente pagas via Mercado Pago. Abaixo dele, o <strong>saldo</strong> (entradas
                  menos saídas do mês), que fica vermelho quando negativo.
                </li>
                <li>
                  <strong>Alunos ativos</strong> — contas de aluno com status Ativo, com o número de professores da
                  equipe logo abaixo.
                </li>
                <li>
                  <strong>Turmas ativas</strong> — turmas com status Ativa (não conta Inativas nem Arquivadas).
                </li>
                <li>
                  <strong>Contratos pendentes</strong> — contratos emitidos que o aluno ainda não assinou. Leva
                  direto para a aba Contratos do Financeiro.
                </li>
              </ul>

              <h3>Atividades recentes</h3>
              <p>
                Feed com os últimos acontecimentos reais da escola, do mais novo para o mais antigo: novos cadastros
                (aluno, professor ou administrador), contratos assinados, pagamentos confirmados e turmas criadas.
                Cada item leva à página onde aquilo aconteceu. Se ainda não houve movimento nenhum, o quadro aparece
                vazio — é o comportamento esperado numa escola recém-configurada.
              </p>
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
                Ao confirmar, a plataforma cria a conta e envia automaticamente um e-mail (com o visual padrão da
                English4You) para o novo usuário definir sua senha de acesso — não é necessário definir uma senha
                manualmente.
              </p>
              <p>
                Use os filtros no topo da lista (<strong>Todos / Alunos / Professores / Admins</strong>) e a busca por
                nome ou e-mail para localizar um usuário rapidamente. O botão <strong>&quot;Link do App&quot;</strong>{" "}
                copia o link da página de instalação do aplicativo (veja a seção{" "}
                <Link href="#instalar-app" className="text-primary hover:underline">
                  Instalar o App
                </Link>{" "}
                mais abaixo) — útil pra mandar por WhatsApp ou e-mail pro aluno.
              </p>
              <p>
                Ao cadastrar um <strong>aluno</strong>, o pacote escolhido é obrigatório: é dele que sai o contrato,
                gerado e enviado automaticamente para assinatura. Por isso é preciso ter pelo menos um{" "}
                <strong>modelo de contrato de aluno ativo</strong> em{" "}
                <Link href="/admin/finance?tab=modelos" className="text-primary hover:underline">
                  Financeiro → Modelos
                </Link>{" "}
                antes de cadastrar o primeiro aluno — sem isso, o cadastro é recusado com um aviso.
              </p>

              <h3>Ficha do usuário</h3>
              <p>
                Clique em qualquer linha da lista (ou no botão <strong>&quot;Ver ficha&quot;</strong>) para abrir a
                página de detalhes do usuário, com quatro blocos:
              </p>
              <ul>
                <li>
                  <strong>Dados pessoais</strong> — CPF, telefone e endereço aparecem mascarados por padrão. Clicar em{" "}
                  <strong>&quot;Ver dados&quot;</strong> pede a <strong>sua própria senha</strong> de administrador
                  antes de exibi-los: a senha é conferida direto pelo Firebase, nunca chega ao nosso servidor, e a
                  liberação vale só até você recarregar a página. Se o usuário ainda não preencheu CPF/endereço (ele
                  faz isso na hora de assinar o contrato), a ficha mostra isso claramente em vez do botão.
                </li>
                <li>
                  <strong>Contratos</strong> — todos os contratos do usuário, com status e data. O botão{" "}
                  <strong>&quot;Baixar&quot;</strong> abre uma versão de impressão do contrato numa aba nova, que já
                  dispara o diálogo de impressão do navegador — escolha <strong>&quot;Salvar como PDF&quot;</strong>{" "}
                  como destino para gerar o arquivo.
                </li>
                <li>
                  <strong>Situação financeira</strong> (só para alunos) — mostra se a mensalidade{" "}
                  <strong>do mês corrente</strong> já foi paga, os dados da assinatura ativa (valor, próxima
                  cobrança, cartão), e o histórico de cobranças pagas e em aberto do Mercado Pago.
                </li>
                <li>
                  <strong>Ativar/Desativar conta</strong> — desativar um <strong>aluno</strong> bloqueia o acesso dele
                  à plataforma, <strong>cancela a assinatura no Mercado Pago</strong> e cancela as cobranças ainda não
                  processadas (as já pagas continuam no histórico, nada é apagado). O usuário recebe um e-mail
                  avisando que a conta foi desativada. Reativar devolve o acesso (sem e-mail de aviso), mas{" "}
                  <strong>não recria a assinatura</strong> — o Mercado Pago não reabre uma cobrança cancelada, então
                  o aluno precisa contratar de novo pelo fluxo normal de matrícula. Você não consegue desativar a
                  própria conta.
                </li>
              </ul>

              <h3>E-mails automáticos</h3>
              <p>
                Três situações disparam um e-mail com o <strong>mesmo visual padronizado</strong> (cabeçalho com a
                marca, botão de destaque, rodapé) — antes cada um tinha um estilo próprio, digitado à parte:
              </p>
              <ul>
                <li><strong>Cadastro de usuário</strong> — link para definir a senha (visto acima).</li>
                <li>
                  <strong>Esqueci minha senha</strong> — o aluno/professor pede em{" "}
                  <code>/forgot-password</code> (fora do painel, na tela de login) e recebe um link de redefinição.
                  Por segurança, a tela sempre mostra a mesma mensagem de sucesso, exista ou não aquele e-mail
                  cadastrado — ninguém consegue usar essa tela pra descobrir se um e-mail tem conta na plataforma.
                </li>
                <li><strong>Conta desativada</strong> — visto acima.</li>
              </ul>
              <InDevelopmentNotice>
                Atenção: o envio de e-mail usa a conta de testes (&quot;sandbox&quot;) do Resend, que só entrega pro
                próprio e-mail do dono da conta. Para os alunos/professores receberem esses e-mails de verdade, é
                preciso verificar um domínio próprio em resend.com/domains e trocar o remetente em{" "}
                <code>lib/resend.ts</code> — sem isso, os envios falham silenciosamente (só aparecem no log do
                servidor).
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
                Em <code>/admin/plans</code> você monta o currículo (plano de ensino) — nome, descrição, lições e
                conteúdo — que depois é atribuído a uma turma em{" "}
                <Link href="/admin/classes" className="text-primary hover:underline">Turmas</Link>.
              </p>

              <h3>Criando um plano</h3>
              <p>
                Clique em <strong>&quot;Criar Plano&quot;</strong> na página inicial e informe nome e descrição. Todo
                plano novo começa como <strong>Rascunho</strong> — use o botão &quot;Editar Plano&quot;, na página do
                plano, para trocar o status entre <strong>Rascunho / Ativo / Arquivado</strong>. Só planos{" "}
                <strong>Ativos</strong> aparecem no seletor de plano de ensino da página de Turmas.
              </p>

              <h3>Página do plano: lições</h3>
              <p>
                Clicar num plano abre uma tela dividida em dois painéis: à esquerda, a lista de lições do plano
                (nessa ordem que elas serão dadas); à direita, o editor da lição selecionada.
              </p>
              <ul>
                <li>
                  <strong>Adicionar Lição</strong> cria uma lição em branco (título e nível) já no final da ordem do
                  plano.
                </li>
                <li>
                  Use as <strong>setas para cima/baixo</strong> em cada lição para reordenar — não há arrastar-e-soltar
                  ainda, só os botões de seta.
                </li>
                <li>
                  <strong>Ativar/Desativar</strong> por lição controla se ela já está liberada para o aluno. Uma
                  lição só pode ser ativada depois de gerar (e revisar) os itens de prática dela — veja abaixo.
                </li>
              </ul>

              <h3>Editando uma lição</h3>
              <ul>
                <li><strong>Título e Nível</strong> — campos simples de texto.</li>
                <li>
                  <strong>Conteúdo da Aula</strong> — editor de texto rico (negrito, itálico, sublinhado, listas,
                  link). Ao colar conteúdo de outro documento (Word, Google Docs, uma página) que contenha imagens,
                  elas são enviadas automaticamente para o servidor — não é preciso fazer upload manual. Clique numa
                  imagem já inserida para redimensioná-la ou movê-la; se você excluir uma imagem do texto e salvar a
                  lição, ela também é apagada do servidor. Também dá pra arrastar um arquivo de imagem direto para
                  dentro do editor.
                  <br />
                  <span className="text-slate-400">
                    Observação: se colar de um documento e uma imagem específica não aparecer (aparece um aviso
                    tracejado no lugar dela), é porque o programa de origem não incluiu os dados da imagem no
                    clipboard, só um caminho de arquivo local — nesse caso, copie a imagem sozinha (clique direito →
                    Copiar) ou arraste o arquivo de imagem direto para o editor.
                  </span>
                </li>
                <li>
                  <strong>Áudio / Vídeo</strong> (opcional) — upload de um arquivo de áudio ou vídeo da aula.
                </li>
                <li>
                  <strong>Transcrição</strong> (opcional) — pode ser colada manualmente, ou fica em branco e a IA
                  preenche automaticamente na primeira vez que gerar os itens de prática (usando o áudio/vídeo
                  enviado).
                </li>
              </ul>

              <h3>Gerando itens de prática com IA</h3>
              <p>
                O botão <strong>&quot;Gerar com IA&quot;</strong> analisa o conteúdo escrito (e a transcrição do
                áudio/vídeo, se houver) e gera automaticamente entre 20–40 itens de <strong>Vocabulário</strong> e
                10–15 de <strong>Estrutura</strong> (gramática) para a prática do aluno. Os itens já entram{" "}
                <strong>aprovados</strong> — cabe a você <strong>remover</strong> os que não fizerem sentido, em vez
                de aprovar um por um. Clique em qualquer item da lista para ver todos os detalhes gerados
                (significados, exemplos, fonética, forma gramatical, etc.).
              </p>
              <p>
                Gerar de novo numa lição que já tem itens não apaga os que você já aprovou — só adiciona uma nova
                leva. Uma lição só pode ser <strong>ativada</strong> quando não sobrar nenhum item pendente de
                revisão (raro, já que tudo entra aprovado por padrão, mas pode acontecer em fluxos futuros).
              </p>

              <InDevelopmentNotice>
                Em desenvolvimento: os itens de prática gerados aqui (vocabulário/estrutura) ainda não viram a tela
                de prática do aluno — essa montagem final (flashcards, quiz, etc. a partir destes itens) é uma
                etapa separada que ainda não foi construída.
              </InDevelopmentNotice>
            </DocSection>

            <DocSection id="financeiro" title="Financeiro" icon={DollarSign}>
              <p>
                Em <code>/admin/finance</code> fica todo o dinheiro da escola, dividido em quatro abas:{" "}
                <strong>Visão Geral</strong> (o livro-caixa), <strong>Contratos</strong>, <strong>Modelos</strong> e{" "}
                <strong>Pacotes</strong>.
              </p>

              <h3>Visão Geral: o livro-caixa</h3>
              <p>
                Esta aba junta as <strong>duas</strong> origens de dinheiro da escola numa lista só:
              </p>
              <ul>
                <li>
                  <strong>O que você lança à mão</strong> — mensalidade paga em PIX ou dinheiro, taxa de matrícula,
                  venda de material, repasse ao professor, aluguel, impostos, ferramentas. Editável e removível.
                </li>
                <li>
                  <strong>O que o Mercado Pago cobra sozinho</strong> — as mensalidades das assinaturas dos alunos.
                  Aparecem marcadas como <strong>Automático</strong> e não podem ser editadas: quem as atualiza é o
                  próprio Mercado Pago, então qualquer alteração manual seria desfeita na próxima cobrança.
                </li>
              </ul>

              <h3>Lançando uma entrada ou saída</h3>
              <p>
                Clique em <strong>&quot;Novo Lançamento&quot;</strong> e escolha o tipo:
              </p>
              <ul>
                <li>
                  <strong>Entrada</strong> — dinheiro que a escola recebeu ou tem a receber (mensalidade, matrícula,
                  material).
                </li>
                <li>
                  <strong>Saída</strong> — dinheiro que a escola pagou ou deve pagar (repasse a professor, aluguel,
                  software, marketing, impostos).
                </li>
              </ul>
              <p>
                Preencha descrição, categoria e valor. A <strong>contraparte</strong> (nome do aluno, do professor ou
                do fornecedor) e a <strong>forma</strong> de pagamento são opcionais — a contraparte é texto livre
                justamente porque nem sempre é alguém cadastrado na plataforma.
              </p>

              <h3>Dívidas e valores a receber</h3>
              <p>
                A caixa <strong>&quot;Já pago&quot; / &quot;Já recebido&quot;</strong> é o que separa um lançamento
                quitado de uma dívida:
              </p>
              <ul>
                <li>
                  <strong>Marcada</strong> — informe a data da liquidação. O lançamento entra nos totais do mês
                  (Entradas ou Saídas) e aparece como <strong>Liquidado</strong>.
                </li>
                <li>
                  <strong>Desmarcada</strong> — o lançamento fica <strong>Em aberto</strong>: uma saída vira uma{" "}
                  <strong>dívida a pagar</strong>, uma entrada vira um <strong>valor a receber</strong>. Passada a
                  data de vencimento, ele muda sozinho para <strong>Vencido</strong> (em vermelho).
                </li>
              </ul>
              <p>
                Na lista, o botão de <strong>✓</strong> marca um lançamento em aberto como liquidado na data de hoje
                (e o botão de desfazer o reabre) sem precisar abrir o formulário — é a operação do dia a dia
                (&quot;essa conta eu já paguei&quot;).
              </p>

              <h3>Como os totais são calculados</h3>
              <ul>
                <li>
                  <strong>Entradas / Saídas do mês</strong> contam pela <strong>data de liquidação</strong>, não pelo
                  vencimento. Uma conta que venceu em julho e foi paga em agosto entra no caixa de agosto — é o mês
                  em que o dinheiro de fato se moveu.
                </li>
                <li>
                  <strong>Em aberto</strong> soma tudo que ainda não foi liquidado, independente do mês, separando a
                  parte a receber da parte a pagar e destacando quantos itens já venceram.
                </li>
              </ul>

              <h3>Filtros e exclusão</h3>
              <p>
                Os botões <strong>Todos / Entradas / Saídas / Em aberto</strong> filtram a lista. Excluir um
                lançamento manual o apaga definitivamente (há uma confirmação antes) — use quando digitou algo
                errado; para um lançamento legítimo que foi cancelado, prefira deixá-lo registrado.
              </p>

              <h3>Contratos, Modelos e Pacotes</h3>
              <ul>
                <li>
                  <strong>Pacotes</strong> — a base comercial: duração em meses, aulas por semana e valor da
                  mensalidade. É o pacote escolhido no cadastro do aluno que define o contrato e o valor cobrado pelo
                  Mercado Pago. Pacotes são <strong>arquivados</strong>, nunca excluídos, porque podem estar
                  vinculados a contratos antigos.
                </li>
                <li>
                  <strong>Modelos</strong> — os textos de contrato (um para aluno, um para professor). Cada alteração
                  gera uma nova versão; contratos já assinados guardam uma cópia congelada do texto vigente na época.
                </li>
                <li>
                  <strong>Contratos</strong> — a lista de contratos emitidos, filtrável por status (aguardando
                  assinatura, ativo, cancelado, concluído).
                </li>
              </ul>
            </DocSection>

            <DocSection id="notificacoes" title="Lembretes de Estudo" icon={BellRing}>
              <p>
                Não é uma página do painel — é um recurso automático que empurra o aluno de volta a estudar, direto
                no aparelho dele (notificação push, mesmo com o navegador fechado).
              </p>

              <h3>Como funciona</h3>
              <p>
                Todo dia, <strong>3 vezes</strong> (9h, 15h e 20h, horário de Brasília), o sistema verifica quais
                alunos <strong>ainda não praticaram no dia</strong> e manda uma notificação puxando pra prática — o
                texto varia a cada envio (várias frases diferentes por horário, pra não parecer robótico). Quem já
                praticou naquele dia <strong>não recebe</strong> o lembrete daquele horário — não faz sentido cutucar
                quem já estudou.
              </p>

              <h3>Como o aluno ativa</h3>
              <p>
                Em <code>/student/profile</code>, o aluno tem um cartão <strong>&quot;Lembretes de estudo&quot;</strong>{" "}
                com um botão pra ativar — o navegador pede permissão de notificação, e a partir daí ele passa a
                receber. Pode desativar a qualquer momento no mesmo lugar. Só <strong>alunos</strong> têm essa opção;
                professores e administradores não recebem.
              </p>

              <h3>O que precisa estar configurado no servidor</h3>
              <p>
                Isso não depende de nenhuma ação do admin no dia a dia, mas para o recurso funcionar em produção é
                preciso, no ambiente de deploy (Vercel):
              </p>
              <ul>
                <li>
                  As variáveis de ambiente <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code>, <code>VAPID_PRIVATE_KEY</code>{" "}
                  (identidade do envio de notificações) e <code>CRON_SECRET</code> (protege a rota que dispara os
                  envios contra chamadas de fora) cadastradas no painel da Vercel.
                </li>
                <li>
                  O arquivo <code>vercel.json</code> do projeto, que registra os 3 horários de disparo — sem ele os
                  lembretes nunca são enviados, mesmo com tudo o mais configurado.
                </li>
              </ul>
            </DocSection>

            <DocSection id="instalar-app" title="Instalar o App" icon={Download}>
              <p>
                <code>/instalar</code> é uma página <strong>pública</strong> (não exige login) pensada pra você
                mandar direto pro aluno — por WhatsApp, e-mail, ou onde for mais fácil — pra ele instalar a
                English4You como um aplicativo, sem precisar entender o que é um &quot;PWA&quot;.
              </p>

              <h3>Como enviar</h3>
              <p>
                Em <code>/admin/users</code>, o botão <strong>&quot;Link do App&quot;</strong> copia o endereço
                completo da página pra você colar onde quiser mandar. A própria página também detecta o
                aparelho/navegador de quem abriu e mostra o passo a passo certo:
              </p>
              <ul>
                <li>
                  <strong>Android/Chrome/Edge</strong> — aparece um botão <strong>&quot;Instalar agora&quot;</strong>{" "}
                  que abre a instalação nativa direto, sem passos manuais.
                </li>
                <li>
                  <strong>iPhone/iPad (Safari)</strong> — o iOS não permite instalar com um clique só; a página
                  mostra o passo a passo (Compartilhar → Adicionar à Tela de Início).
                </li>
                <li>
                  <strong>Computador (Chrome/Edge)</strong> — mostra onde fica o ícone de instalação na barra de
                  endereço.
                </li>
              </ul>
              <p>
                Se o aparelho já tiver o app instalado, a página percebe sozinha e mostra uma confirmação em vez do
                passo a passo, com um atalho direto pro login.
              </p>
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
