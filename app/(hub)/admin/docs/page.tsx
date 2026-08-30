import type { Metadata } from "next";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DocHeading } from "./_components/DocHeading";
import { CopyLinkButton } from "./_components/CopyLinkButton";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  UserCircle,
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
      <div className="group flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="font-bold text-slate-900 text-base">{title}</h2>
        <CopyLinkButton anchorId={id} title={title} />
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
              <p>
                <strong>Compartilhar um trecho:</strong> passe o mouse sobre o título de qualquer seção ou
                subtítulo e clique no ícone de <strong>elo</strong> que aparece ao lado. O link do tópico é
                copiado, e quem abrir cai direto nele em vez de ter que procurar na página. Serve para mandar a
                explicação exata de uma dúvida por WhatsApp ou e-mail.
              </p>
            </DocSection>

            <DocSection id="dashboard" title="Dashboard" icon={LayoutDashboard}>
              <p>
                Página inicial (<code>/admin</code>) com um resumo da operação. Todos os números vêm do banco de
                dados em tempo real — nada aqui é fixo. Clicar em qualquer card leva à página correspondente.
              </p>

              <DocHeading id="os-quatro-cards">Os quatro cards</DocHeading>
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

              <DocHeading id="atividades-recentes">Atividades recentes</DocHeading>
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
              <DocHeading id="como-cadastrar-um-novo-usuario">Como cadastrar um novo usuário</DocHeading>
              <ol>
                <li>Clique em <strong>&quot;Adicionar Usuário&quot;</strong>.</li>
                <li>Preencha nome completo e e-mail, e escolha o <strong>Perfil de Acesso</strong> (Aluno, Professor ou Administrador).</li>
                <li>Se o perfil for <strong>Aluno</strong>, selecione também o pacote de aulas contratado.</li>
                <li>
                  Ainda para <strong>Aluno</strong>, informe se ele tem <strong>bolsa de estudos</strong> (veja
                  logo abaixo). O padrão é &quot;Sem bolsa&quot;, que mantém o comportamento de sempre.
                </li>
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

              <DocHeading id="bolsa-de-estudos-bolsistas">Bolsa de estudos (bolsistas)</DocHeading>
              <p>
                Nem todo aluno paga a mensalidade cheia. No cadastro (e depois, na ficha dele) você define os
                termos da bolsa, que ficam gravados <strong>no contrato daquela matrícula</strong> — não na conta
                do aluno. Isso é proposital: se ele renovar no semestre seguinte sem bolsa, o histórico continua
                mostrando sob quais condições ele estudou em cada período.
              </p>
              <ul>
                <li>
                  <strong>Sem bolsa</strong> — o padrão. Paga o valor cheio do pacote, com assinatura no Mercado
                  Pago. Nada muda em relação ao que já existia.
                </li>
                <li>
                  <strong>Bolsa integral</strong> — o aluno <strong>não paga nada</strong>. Não há assinatura, não
                  há cobrança e ele nunca passa pelo checkout: assinar o contrato já conclui a matrícula.
                </li>
                <li>
                  <strong>Bolsa parcial</strong> — você informa o percentual (de 1 a 99) e a plataforma calcula a
                  mensalidade com desconto, mostrando o valor final antes de você confirmar.
                </li>
              </ul>
              <p>
                Para a bolsa parcial você ainda escolhe <strong>como cobrar a diferença</strong>:
              </p>
              <ul>
                <li>
                  <strong>Assinatura no Mercado Pago</strong> — cobrança automática no cartão, igual a qualquer
                  aluno, só que no valor já com o desconto.
                </li>
                <li>
                  <strong>Controle manual</strong> — a plataforma <strong>não cobra nada</strong>. A escola combina
                  o pagamento por fora (PIX, dinheiro, boleto) e registra os recebimentos no livro-caixa em{" "}
                  <Link href="/admin/finance" className="text-primary hover:underline">Financeiro → Visão Geral</Link>.
                  A ficha do aluno deixa isso explícito, para que a ausência de cobranças não seja lida como
                  inadimplência. <strong>A plataforma não bloqueia esse aluno por falta de pagamento</strong> — veja
                  &quot;Inadimplência de quem paga por fora&quot;, logo abaixo.
                </li>
              </ul>
              <p>
                O controle manual também serve para um aluno <strong>sem bolsa</strong> que prefira pagar por fora:
                basta escolher &quot;Sem bolsa&quot; e, na ficha dele, mudar a cobrança para manual.
              </p>

              <DocHeading id="aluno-que-ja-estuda-na-escola-migracao">Aluno que já estuda na escola (migração)</DocHeading>
              <p>
                Quem <strong>já tem aulas</strong> e já pagou a mensalidade deste mês por fora não
                pode ser cobrado de novo ao entrar na plataforma. Há duas formas, e a escolha depende
                de como ele vai pagar <strong>daqui pra frente</strong>.
              </p>
              <p>
                <strong>1. Vai passar a pagar pelo Mercado Pago</strong> (o caso mais comum). No
                cadastro, deixe a cobrança em <strong>Mercado Pago</strong> e, em{" "}
                <strong>&quot;Primeira cobrança&quot;</strong>, escolha{" "}
                <strong>&quot;Pular a primeira — cobrar a partir de uma data&quot;</strong> e informe
                quando a próxima mensalidade vence. O aluno cadastra o cartão normalmente, mas o
                Mercado Pago <strong>só cobra na data escolhida</strong> — as seguintes seguem o
                ciclo mensal a partir dali.
              </p>
              <p>
                <strong>2. Vai continuar pagando por fora</strong> (PIX, dinheiro). Aí escolha{" "}
                <strong>&quot;Controle manual&quot;</strong> em &quot;Como cobrar a mensalidade&quot;:
                o aluno não passa pelo checkout, assina o contrato e o acesso é liberado na hora. A
                escola registra os recebimentos no livro-caixa.
              </p>
              <p>
                Nos dois casos, faça a escolha <strong>no cadastro</strong>, não depois. Mudar a forma
                de cobrança na ficha de um aluno já cadastrado <strong>reemite o contrato</strong>:
                ele perde o acesso até assinar de novo e recebe um segundo e-mail.
              </p>
              <p>
                O adiamento vale <strong>só para a primeira cobrança</strong> e só existe para quem é
                cobrado pelo Mercado Pago — bolsista integral e aluno de controle manual não têm
                cobrança para adiar. A data precisa ser futura; o Mercado Pago recusa data no
                passado.
              </p>

              <DocHeading id="registrar-um-pagamento-recebido-por-fora">Registrar um pagamento recebido por fora</DocHeading>
              <p>
                Mensalidade paga em PIX, dinheiro ou transferência se registra em{" "}
                <Link href="/admin/finance" className="text-primary hover:underline">Financeiro → Visão Geral</Link>,
                como um lançamento de <strong>entrada</strong> na categoria <strong>Mensalidade</strong>,
                marcando <strong>&quot;Já recebido&quot;</strong> (ou deixando em aberto, se ainda vai
                receber, e usando o botão <strong>✓</strong> quando o dinheiro entrar).
              </p>
              <p>
                <strong>Uma limitação a conhecer:</strong> esse lançamento entra no caixa da escola,
                mas <strong>não fica vinculado à ficha do aluno</strong> — o campo de contraparte é
                texto livre, porque nem toda contraparte do caixa é usuário da plataforma. Na prática:
                o valor aparece nos totais e no extrato do Financeiro, mas a aba
                &quot;Situação financeira&quot; do aluno continua mostrando apenas as cobranças do
                Mercado Pago. Escreva o nome do aluno na contraparte para conseguir localizar depois.
              </p>
              <p>
                Não existe (e é proposital) um botão para marcar uma <strong>cobrança do Mercado
                Pago</strong> como paga à mão: aquele registro é espelho do que aconteceu lá, e
                editá-lo faria a plataforma discordar do provedor — além de liberar acesso por uma
                porta paralela ao controle de pagamento. Quem não é cobrado pela plataforma deve
                estar em <strong>cobrança manual</strong>.
              </p>

              <DocHeading id="inadimplencia-de-quem-paga-por-fora">Inadimplência de quem paga por fora</DocHeading>
              <p>
                <strong>A plataforma nunca bloqueia sozinha um aluno de cobrança manual.</strong> Ela não tem como
                saber se ele pagou: o dinheiro entra por PIX, dinheiro ou boleto, fora do sistema, sem nenhum aviso
                automático. Enquanto o contrato estiver assinado, ele continua estudando normalmente — esteja em dia
                ou três meses atrasado.
              </p>
              <p>
                Isso é proposital. Bloquear por ausência de informação expulsaria da aula um aluno que pagou em dia
                no caixa da escola. Quem decide que houve inadimplência é a escola, não o sistema. O caminho é:
              </p>
              <ol>
                <li>
                  <strong>Lançar a mensalidade</strong> em{" "}
                  <Link href="/admin/finance" className="text-primary hover:underline">Financeiro → Visão Geral</Link>{" "}
                  como uma entrada a receber, com a data de vencimento. Enquanto não for marcada como liquidada, ela
                  aparece em <strong>&quot;Em aberto&quot;</strong>, com destaque para o que já venceu — esse é o seu
                  painel de inadimplência desses alunos.
                </li>
                <li>
                  <strong>Cobrar o aluno</strong> pelos canais da escola.
                </li>
                <li>
                  Persistindo o atraso, <strong>desativar a conta</strong> na ficha do aluno. Esse é o único
                  mecanismo de bloqueio para cobrança manual.
                </li>
              </ol>
              <p>
                <strong>Atenção:</strong> o passo 1 depende de alguém lançar a mensalidade. Se ninguém lançar, não há
                nada a vencer e o atraso <strong>não aparece em lugar nenhum</strong> — o aluno some do radar
                financeiro. Antes de colocar vários alunos em cobrança manual, combine essa rotina de lançamento com
                a secretaria.
              </p>
              <p>
                A boa notícia é que desativar e reativar um aluno de cobrança manual é um ciclo leve:{" "}
                <strong>reativar devolve o acesso na hora</strong>, sem onboarding, sem reassinatura e sem checkout.
                É diferente do aluno cobrado pelo Mercado Pago, que precisa contratar de novo porque o preapproval
                cancelado não é reaberto.
              </p>
              <p>
                <strong>Atenção — o bolsista assina um contrato diferente.</strong> É preciso ter um modelo do tipo
                <strong> Bolsista</strong> ativo em{" "}
                <Link href="/admin/finance?tab=modelos" className="text-primary hover:underline">
                  Financeiro → Modelos
                </Link>{" "}
                antes de cadastrar o primeiro bolsista — senão o cadastro é recusado com um aviso. Esse modelo tem
                variáveis próprias ({"{{percentual_bolsa}}"}, {"{{valor_bolsista}}"}, {"{{valor_desconto}}"} e{" "}
                {"{{forma_cobranca}}"}) para escrever a cláusula da bolsa.
              </p>
              <p>
                <strong>Alterar a bolsa depois</strong> é possível pelo card &quot;Bolsa de estudos&quot; na ficha do
                aluno, mas não é uma edição simples: como o contrato assinado tem o valor antigo escrito dentro dele,
                a plataforma <strong>cancela o contrato e a assinatura atuais e emite um contrato novo</strong>, do
                modelo correto. O aluno volta para o onboarding e precisa <strong>assinar de novo</strong> antes de
                voltar a estudar. As mensalidades já pagas permanecem no histórico, e não há estorno automático do
                mês já cobrado — se houver crédito a devolver, isso é acertado à mão no livro-caixa.
              </p>

              <DocHeading id="ficha-do-usuario">Ficha do usuário</DocHeading>
              <p>
                Clique em qualquer linha da lista (ou no botão <strong>&quot;Ver ficha&quot;</strong>) para abrir a
                página de detalhes do usuário, com cinco blocos:
              </p>
              <ul>
                <li>
                  <strong>Dados pessoais</strong> — CPF, telefone e endereço são preenchidos pelo próprio usuário
                  na hora de assinar o contrato, e aparecem mascarados por padrão. Clicar em{" "}
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
                  <strong>Bolsa de estudos</strong> (só para alunos) — mostra os termos vigentes (sem bolsa,
                  integral ou o percentual) e como a mensalidade é cobrada. O botão{" "}
                  <strong>&quot;Alterar bolsa&quot;</strong> reemite o contrato — veja o aviso na seção acima.
                </li>
                <li>
                  <strong>Situação financeira</strong> (só para alunos) — mostra se a mensalidade{" "}
                  <strong>do mês corrente</strong> já foi paga, os dados da assinatura ativa (valor, próxima
                  cobrança, cartão), e o histórico de cobranças pagas e em aberto do Mercado Pago. Para bolsista
                  integral ou aluno de cobrança manual, este bloco muda: em vez de alertar sobre uma mensalidade
                  que não existe, ele explica que a plataforma não cobra esse aluno.
                </li>
                <li>
                  <strong>Ativar/Desativar conta</strong> — desativar um <strong>aluno</strong> bloqueia o acesso dele
                  à plataforma, <strong>cancela a assinatura no Mercado Pago</strong> e cancela as cobranças ainda não
                  processadas (as já pagas continuam no histórico, nada é apagado). O usuário recebe um e-mail
                  avisando que a conta foi desativada e, ao tentar entrar, vê uma tela explicando que o acesso está
                  suspenso — sem nenhum botão para se recontratar sozinho. O bloqueio vale para{" "}
                  <strong>qualquer aluno</strong>, inclusive bolsista integral e aluno de cobrança manual, que não
                  têm assinatura para cancelar. Reativar devolve o acesso (sem e-mail de aviso), mas{" "}
                  <strong>não recria a assinatura</strong> — o Mercado Pago não reabre uma cobrança cancelada, então
                  o aluno pagante precisa contratar de novo pelo fluxo normal de matrícula. Você não consegue
                  desativar a própria conta.
                </li>
              </ul>

              <DocHeading id="e-mails-automaticos">E-mails automáticos</DocHeading>
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
            </DocSection>

            <DocSection id="turmas" title="Turmas" icon={GraduationCap}>
              <p>
                Em <code>/admin/classes</code> você cria e gerencia as turmas da escola: horários, professor
                responsável, plano de ensino, lista de alunos e a grade de aulas.
              </p>

              <DocHeading id="criando-uma-turma">Criando uma turma</DocHeading>
              <p>
                Clique em <strong>&quot;Criar Nova Turma&quot;</strong> e informe nome, nível e o horário semanal
                (adicione quantos dias/horários forem necessários — normalmente 2x por semana, mas você pode
                configurar qualquer frequência). A turma é criada imediatamente e aparece na lista antes mesmo da
                confirmação do servidor terminar. Professor e plano de ensino são definidos depois, na página de
                detalhes da turma.
              </p>

              <DocHeading id="filtrando-a-lista-de-turmas">Filtrando a lista de turmas</DocHeading>
              <p>
                Use os filtros <strong>Ativas / Inativas / Arquivadas / Todas</strong> e a busca (por nome, nível ou
                professor) no topo da página. Por padrão, apenas turmas <strong>Ativas</strong> são exibidas.
              </p>

              <DocHeading id="pagina-de-detalhes-da-turma">Página de detalhes da turma</DocHeading>
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

              <DocHeading id="gravacoes-das-aulas">Gravações das aulas ⚠️</DocHeading>
              <p>
                As aulas ao vivo são gravadas automaticamente. Quando a gravação fica pronta, os alunos
                da turma recebem um e-mail e uma notificação no sino, com o link para reassistir.
              </p>
              <p>
                <strong>
                  A gravação é apagada automaticamente 14 dias depois da aula, e não há como
                  recuperá-la.
                </strong>{" "}
                Esse prazo é da plataforma de vídeo (Stream), não da English4You — o arquivo sai do
                servidor deles e ninguém, nem o suporte, consegue trazê-lo de volta.
              </p>
              <p>
                Por isso, <strong>se uma aula precisa ser guardada, alguém da coordenação tem que
                baixar o arquivo dentro desse prazo</strong> e arquivá-lo onde a escola guarda seus
                materiais (Drive, HD, o que for).
              </p>
              <p>
                Para isso não depender da memória de ninguém, a própria tela de{" "}
                <Link href="/admin/classes" className="text-primary hover:underline">Turmas</Link>{" "}
                mostra um <strong>aviso no topo</strong> com todas as gravações ainda não baixadas,
                cada uma com os <strong>dias restantes</strong> e a data em que será apagada. O aviso
                fica âmbar e vira <strong>vermelho quando faltam 3 dias ou menos</strong>.
              </p>
              <p>
                Cada item tem dois botões: <strong>&quot;Baixar&quot;</strong>, que abre o arquivo de
                vídeo, e <strong>&quot;Já baixei&quot;</strong>, que dá a aula por arquivada e a tira
                da lista. São separados de propósito — o sistema não tem como saber se o download
                terminou de verdade, então quem confirma é você. Enquanto ninguém confirmar, a
                pendência continua aparecendo.
              </p>
              <p>
                Uma aula gravada mais de uma vez (quando a chamada cai e o professor reabre) aparece
                com um botão de download por arquivo — baixe todos antes de confirmar.
              </p>
              <p>
                O e-mail que o aluno recebe diz explicitamente até que data aquela gravação estará no
                ar, para ele não deixar para depois.
              </p>

              <DocHeading id="status-da-turma-ativa-inativa-e-arquivada">Status da turma: Ativa, Inativa e Arquivada</DocHeading>
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

              <DocHeading id="criando-um-plano">Criando um plano</DocHeading>
              <p>
                Clique em <strong>&quot;Criar Plano&quot;</strong> na página inicial e informe nome e descrição. Todo
                plano novo começa como <strong>Rascunho</strong> — use o botão &quot;Editar Plano&quot;, na página do
                plano, para trocar o status entre <strong>Rascunho / Ativo / Arquivado</strong>. Só planos{" "}
                <strong>Ativos</strong> aparecem no seletor de plano de ensino da página de Turmas.
              </p>

              <DocHeading id="pagina-do-plano-licoes">Página do plano: lições</DocHeading>
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

              <DocHeading id="editando-uma-licao">Editando uma lição</DocHeading>
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
                  <strong>Áudio / Vídeo</strong> (opcional) — upload de um arquivo de áudio ou vídeo da aula. Só o{" "}
                  <strong>áudio</strong> é transcrito automaticamente pela IA; se a aula estiver em vídeo e você
                  quiser a prática de compreensão auditiva, envie também o áudio (ou cole a transcrição à mão).
                </li>
                <li>
                  <strong>Transcrição</strong> (opcional) — pode ser colada manualmente, ou fica em branco e a IA
                  preenche automaticamente na primeira vez que gerar os itens de prática (usando o áudio enviado).
                </li>
              </ul>

              <DocHeading id="gerando-itens-de-pratica-com-ia">Gerando itens de prática com IA</DocHeading>
              <p>
                O botão <strong>&quot;Gerar com IA&quot;</strong> analisa o conteúdo escrito (e a transcrição do
                áudio, se houver) e gera automaticamente entre 20–40 itens de <strong>Vocabulário</strong> e
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

            </DocSection>

            <DocSection id="financeiro" title="Financeiro" icon={DollarSign}>
              <p>
                Em <code>/admin/finance</code> fica todo o dinheiro da escola, dividido em quatro abas:{" "}
                <strong>Visão Geral</strong> (o livro-caixa), <strong>Contratos</strong>, <strong>Modelos</strong> e{" "}
                <strong>Pacotes</strong>.
              </p>

              <DocHeading id="visao-geral-o-livro-caixa">Visão Geral: o livro-caixa</DocHeading>
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

              <DocHeading id="lancando-uma-entrada-ou-saida">Lançando uma entrada ou saída</DocHeading>
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

              <DocHeading id="dividas-e-valores-a-receber">Dívidas e valores a receber</DocHeading>
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

              <DocHeading id="como-os-totais-sao-calculados">Como os totais são calculados</DocHeading>
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

              <DocHeading id="filtros-e-exclusao">Filtros e exclusão</DocHeading>
              <p>
                Os botões <strong>Todos / Entradas / Saídas / Em aberto</strong> filtram a lista. Excluir um
                lançamento manual o apaga definitivamente (há uma confirmação antes) — use quando digitou algo
                errado; para um lançamento legítimo que foi cancelado, prefira deixá-lo registrado.
              </p>

              <DocHeading id="contratos-modelos-e-pacotes">Contratos, Modelos e Pacotes</DocHeading>
              <ul>
                <li>
                  <strong>Pacotes</strong> — a base comercial: duração em meses, aulas por semana e valor da
                  mensalidade. É o pacote escolhido no cadastro do aluno que define o contrato e o valor cobrado pelo
                  Mercado Pago. O valor do pacote é sempre o <strong>preço cheio</strong>: um desconto de bolsista
                  não vira pacote novo, é registrado no contrato do aluno (veja{" "}
                  <Link href="#usuarios" className="text-primary hover:underline">Usuários → Bolsa de estudos</Link>).
                  Pacotes são <strong>arquivados</strong>, nunca excluídos, porque podem estar vinculados a
                  contratos antigos.
                </li>
                <li>
                  <strong>Modelos</strong> — os textos de contrato. Cada modelo tem um <strong>perfil</strong>
                  (aluno ou professor) e, para aluno, um <strong>tipo</strong>: <strong>Padrão</strong> ou{" "}
                  <strong>Bolsista</strong>. Fica <strong>um modelo ativo por perfil e tipo</strong>, então o
                  contrato padrão e o de bolsista podem (e devem) estar ativos ao mesmo tempo — é o tipo que decide
                  qual texto o aluno assina. Cada alteração gera uma nova versão; contratos já assinados guardam uma
                  cópia congelada do texto vigente na época.
                </li>
                <li>
                  <strong>Contratos</strong> — a lista de contratos emitidos, filtrável por status (aguardando
                  assinatura, ativo, cancelado, concluído). Clicar num contrato abre a ficha dele, de onde se
                  <strong>troca o pacote do aluno</strong> ou se <strong>cancela o contrato</strong> — veja abaixo.
                </li>
              </ul>

              <DocHeading id="criar-editar-e-arquivar-pacotes">Criar, editar e arquivar pacotes</DocHeading>
              <p>
                Na aba <strong>Pacotes</strong>, o botão <strong>&quot;Novo pacote&quot;</strong> pede nome, duração
                em meses, aulas por semana e o valor da mensalidade. É preciso ter pelo menos um pacote ativo antes
                de cadastrar o primeiro aluno — o seletor do cadastro puxa daqui.
              </p>
              <p>
                Clicar num pacote existente abre o mesmo formulário para <strong>editar</strong>. E aqui está a
                parte que mais confunde: <strong>editar um pacote NÃO altera quem já contratou</strong>. O pacote é
                a tabela de preços; o que cada aluno paga foi congelado no contrato e na assinatura dele. Na prática:
              </p>
              <ul>
                <li>
                  <strong>Aluno com assinatura já autorizada</strong> — continua pagando o valor antigo, para sempre.
                  O Mercado Pago segue cobrando o valor combinado quando ele autorizou o cartão. Subir o preço aqui
                  não reajusta ninguém.
                </li>
                <li>
                  <strong>Contrato já assinado</strong> — o texto ficou congelado no momento da assinatura, com o
                  valor da época. Editar o pacote não reescreve contrato assinado.
                </li>
                <li>
                  <strong>Contrato ainda aguardando assinatura</strong> — <strong>este muda</strong>. O texto é
                  montado na hora, então o aluno vai ver e pagar o valor NOVO. Se você reajustar o preço enquanto há
                  contratos pendentes, esses alunos são pegos pelo reajuste sem terem sido avisados.
                </li>
                <li>
                  <strong>Duração em meses</strong> — só vale para contratos futuros. A data de término de um
                  contrato existente foi calculada quando ele foi emitido e não é recalculada.
                </li>
              </ul>
              <p>
                Ou seja: <strong>para reajustar quem já é aluno, editar o pacote não basta</strong> — é preciso
                trocar o pacote do aluno (logo abaixo), o que reemite o contrato e exige nova assinatura. Editar o
                pacote serve para as <strong>próximas</strong> matrículas.
              </p>
              <p>
                <strong>Arquivar</strong> um pacote apenas o tira do seletor de novos alunos — contratos e
                assinaturas existentes continuam funcionando normalmente. Pacotes nunca são excluídos, porque estão
                referenciados por contratos antigos que precisam continuar legíveis. O mesmo botão reativa um pacote
                arquivado.
              </p>

              <DocHeading id="trocar-o-pacote-de-um-aluno">Trocar o pacote de um aluno</DocHeading>
              <p>
                O pacote é <strong>individual por aluno</strong>: cada um tem o seu no próprio contrato, então
                trocar o pacote de um não mexe em mais ninguém. (Editar o pacote em <strong>Pacotes</strong> é outra
                coisa — ali você altera a definição comercial, que vale para todo mundo que vier a contratá-la.)
              </p>
              <p>
                O caminho é pela <strong>ficha do contrato</strong>, e não pela ficha do usuário: abra{" "}
                <Link href="/admin/finance?tab=contratos" className="text-primary hover:underline">
                  Financeiro → Contratos
                </Link>
                , clique no contrato do aluno e use <strong>&quot;Trocar pacote&quot;</strong>. O botão só aparece
                em contratos <strong>aguardando assinatura</strong> ou <strong>ativos</strong> — um contrato
                cancelado ou concluído não é editável, nesse caso emita um contrato novo.
              </p>
              <p>
                Ao confirmar, a plataforma cancela a assinatura no Mercado Pago, cancela o contrato atual e{" "}
                <strong>emite um contrato novo</strong> com o pacote escolhido. Consequências que valem avisar ao
                aluno antes:
              </p>
              <ul>
                <li>
                  Ele <strong>perde o acesso até assinar o contrato novo</strong> e, se for cobrado pelo Mercado
                  Pago, refazer o cadastro do cartão. Não é uma troca silenciosa.
                </li>
                <li>
                  <strong>Não há proporcional nem estorno.</strong> A mensalidade já cobrada no mês não volta, e a
                  assinatura nova começa do zero. Qualquer diferença é acertada à mão no livro-caixa.
                </li>
                <li>
                  <strong>A vigência recomeça.</strong> O contrato novo começa hoje e o vencimento é recalculado
                  pela duração do pacote novo — trocar no meio do semestre <strong>estende</strong> o fim do
                  contrato, não aproveita o tempo já corrido.
                </li>
                <li>
                  Se o aluno for <strong>bolsista</strong>, os termos da bolsa são preservados no contrato novo.
                </li>
              </ul>
              <p>
                Se a intenção é apenas mudar <strong>quanto o aluno paga</strong>, e não a estrutura do curso
                (duração e aulas por semana), o caminho certo é a{" "}
                <Link href="#usuarios" className="text-primary hover:underline">bolsa de estudos</Link> na ficha
                dele — não a troca de pacote, e muito menos criar um pacote novo só para ele.
              </p>

              <DocHeading id="cancelar-um-contrato">Cancelar um contrato</DocHeading>
              <p>
                Também na ficha do contrato. Cancela o contrato e a cobrança recorrente de uma vez. Use quando o
                aluno desiste do curso; para apenas suspender o acesso temporariamente, prefira{" "}
                <strong>desativar a conta</strong> na ficha do usuário.
              </p>
            </DocSection>

            <DocSection id="notificacoes" title="Lembretes de Estudo" icon={BellRing}>
              <p>
                Não é uma página do painel — é um recurso automático que empurra o aluno de volta a estudar, direto
                no aparelho dele (notificação push, mesmo com o navegador fechado).
              </p>

              <DocHeading id="como-funciona">Como funciona</DocHeading>
              <p>
                Todo dia, <strong>3 vezes</strong> (9h, 15h e 20h, horário de Brasília), o sistema verifica quais
                alunos <strong>ainda não praticaram no dia</strong> e manda uma notificação puxando pra prática — o
                texto varia a cada envio (várias frases diferentes por horário, pra não parecer robótico). Quem já
                praticou naquele dia <strong>não recebe</strong> o lembrete daquele horário — não faz sentido cutucar
                quem já estudou.
              </p>

              <DocHeading id="como-o-aluno-ativa">Como o aluno ativa</DocHeading>
              <p>
                Em <code>/student/profile</code>, o aluno tem um cartão <strong>&quot;Lembretes de estudo&quot;</strong>{" "}
                com um botão pra ativar — o navegador pede permissão de notificação, e a partir daí ele passa a
                receber. Pode desativar a qualquer momento no mesmo lugar. Só <strong>alunos</strong> têm essa opção;
                professores e administradores não recebem.
              </p>

              <DocHeading id="o-que-precisa-estar-configurado-no-servidor">O que precisa estar configurado no servidor</DocHeading>
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

              <DocHeading id="como-enviar">Como enviar</DocHeading>
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
