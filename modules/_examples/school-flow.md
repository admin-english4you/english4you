# Resumo e Fluxo da Plataforma English4You

Este documento ilustra a relação entre as entidades do sistema e o fluxo completo de um aluno na escola, desde a parte financeira até a prática gerada por inteligência artificial.

## 📊 Infográfico do Fluxo de Entidades

O diagrama abaixo mostra como os diferentes módulos se conectam no banco de dados e nas regras de negócio (DDD):

```mermaid
graph TD
    %% Cores e Estilos
    classDef person fill:#f9d0c4,stroke:#333,stroke-width:2px;
    classDef finance fill:#d4f1f4,stroke:#333,stroke-width:2px;
    classDef class fill:#e2f0cb,stroke:#333,stroke-width:2px;
    classDef practice fill:#f6e8ff,stroke:#333,stroke-width:2px;

    %% 1. Usuários
    Student(("🧑‍🎓 Aluno (STUDENT)")):::person
    Teacher(("👨‍🏫 Professor (TEACHER)")):::person
    Admin(("🧑‍💼 Coordenador (ADMIN)")):::person

    %% 2. Financeiro (Azul)
    Package["📦 Pacote<br>(Package)"]:::finance
    Contract["📄 Contrato<br>(Contract)"]:::finance
    Payment["💳 Pagamento<br>(Payment)"]:::finance

    Admin -->|Cria| Package
    Student -->|Assina| Contract
    Contract -->|Baseado no| Package
    Contract -->|Gera parcelas| Payment

    %% 3. Turmas e Planos (Verde)
    Plan["📚 Plano de Ensino<br>(Plan)"]:::class
    ClassGroup["👥 Turma<br>(ClassGroup)"]:::class
    Lesson["📖 Lição<br>(Lesson)"]:::class
    ClassRecord["📝 Registro de Aula<br>(ClassRecord)"]:::class

    Admin -->|Cria| Plan
    Admin -->|Aloca em| ClassGroup
    Plan -->|Define a ordem das| Lesson
    Teacher -->|Leciona para| ClassGroup
    Student -->|Pertence à| ClassGroup

    Teacher -->|Inicia/Registra Aula| ClassRecord
    ClassRecord -->|Referencia a| ClassGroup
    ClassRecord -->|Avança o conteúdo da| Lesson

    %% 4. Prática e IA (Roxo)
    LearningItem["🧠 Item de Aprendizado<br>(LearningItem: Vocab/Structure)"]:::practice
    LessonLearningItem["🔗 Junção<br>(LessonLearningItem)"]:::practice
    PracticeItem["🎮 Exercício Final<br>(PracticeItem: Flashcard, Quiz...)"]:::practice

    Lesson -->|IA extrai conteúdo para| LearningItem
    Lesson -->|Tabela associativa| LessonLearningItem
    LearningItem -->|Tabela associativa| LessonLearningItem
    LessonLearningItem -->|Backend transforma em tempo real| PracticeItem

    Student -.->|Pratica diariamente| PracticeItem

```

---

## 🔄 Entendendo a Jornada do Aluno

### 1. Matrícula e Financeiro (Módulo `finance` & `user`)

- O **Admin** cadastra o **Package** (ex: Duração de 6 meses, Valor da mensalidade).
- Ao criar o **Student**, um **Contract** é gerado com base no pacote, com status `PENDING_SIGNATURE`.
- A plataforma gera as parcelas (`Payment`). Uma vez integrado via Webhooks, quando o Mercado Pago notifica sucesso, a parcela vira `PAID` e o acesso é garantido. Se o status virar `OVERDUE`, o acesso é bloqueado.

### 2. Aulas Ao Vivo (Módulo `class`, `plan` & `lesson`)

- O **Student** é inserido em um **ClassGroup** (Turma) por um Admin.
- A Turma segue um **Plan** (Plano de ensino), que é composto por várias **Lessons** (Lições) organizadas.
- O **Teacher** inicia a aula, criando um **ClassRecord**. Ao finalizar a aula e confirmar os presentes (`attendance`), a lição daquele dia muda do status `IN_PROGRESS` para `ACTIVE` (Aula dada).

### 3. A Mágica da Prática com IA (Módulo `practice`)

- Quando a `Lesson` foi originalmente cadastrada, a **Inteligência Artificial** analisou o conteúdo (`content`) e gerou diversos **LearningItems** (Vocabulário e Estrutura/Gramática), salvando os metadados (como traduções, fonética e exemplos).
- Após o `ClassRecord` ser fechado, o aluno tem acesso à prática.
- O sistema olha onde o aluno está, busca os `LearningItems` vinculados à lição e, dependendo de **qual é o dia da semana** de prática, o _backend_ os transforma e envia os **PracticeItems** formatados corretamente (ex: `flashcard_visual` no dia 1, `gap_fill_listening` no dia 2, etc.).
