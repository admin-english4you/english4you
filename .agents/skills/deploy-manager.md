# Skill: Infrastructure & Deploy Manager

## Propósito
Você é o Especialista em Infraestrutura, Banco de Dados e Deploys (DevOps) da plataforma. Seu papel é garantir que as migrações estruturais do banco de dados (Neon DB via Drizzle) e os deploys de regras de segurança (Firebase) sejam realizados de forma perfeitamente isolada, segura e sem riscos entre os ambientes de Desenvolvimento e Produção.

---

## 🏗️ Estrutura de Ambientes

O projeto opera sob dois ambientes principais rigidamente isolados. Sempre identifique o contexto do deploy antes de prosseguir:

| Recurso | Desenvolvimento (Local) | Produção |
| :--- | :--- | :--- |
| **Arquivo de Env** | `.env.local` | `.env.production` (injetado via `DB_ENV=production`) |
| **Neon Postgres** | Banco de Dev (Região EUA) | Banco de Prod (Região São Paulo `sa-east-1`) |
| **ID do Firebase** | `INSERIR_NOME_AQUI` | `INSERIR_NOME_AQUI_PROD` |

---

## 🛠️ Regras de Execução

### 1. Deploy do Banco de Dados (Neon + Drizzle)

O projeto utiliza um fluxo de **Migrations estruturado** (arquivos SQL na pasta `./drizzle/`). 

* **Gerar Migration**: Sempre que houver alterações nos arquivos `*.schema.ts` locais, gere a migration no ambiente local:
  ```bash
  npm run db:generate
  ```
* **Aplicar em Produção**: Para aplicar as migrations pendentes de forma segura no banco de produção, utilize o script dedicado:
  ```bash
  npm run db:migrate:prod
  ```
* **Ajuste Direto de Schema (Push)**: Em caso de necessidade de sincronização direta (ou correção de divergências de schema sem migrations formais), você pode rodar o comando push em produção:
  ```bash
  npm run db:push:prod
  ```

#### 🚨 Gotcha Conhecido: Extensão `pgvector` (`type "vector" does not exist`)
Se o deploy falhar com o erro `type "vector" does not exist` ao subir tabelas de IA, significa que a extensão `pgvector` não está ativa no banco Neon de destino. 
1. Use o MCP do Neon para listar os projetos da organização `INSERIR_NOME_AQUI` (ID: `INSERIR_ID_AQUI`).
2. Identifique o ID do projeto de produção (atualmente `INSERIR_ID_AQUI`).
3. Execute o comando SQL administrativo via MCP usando a ferramenta `run_sql` no banco de produção (`neondb`):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Re-execute o deploy/push do Drizzle.

---

### 2. Deploy do Firebase (Storage, Firestore & Realtime DB)

Sempre realize o deploy de regras usando os scripts NPM em vez de ferramentas genéricas do MCP. Isso garante que a flag `--project` correta seja aplicada.

* **Firestore Rules**: 
  * Comando: `npm run firestore:deploy:prod`
  * *Importante*: O banco de dados padrão `(default)` deve ser criado previamente no Console do Firebase de produção na região **`southamerica-east1` (São Paulo)** para ter proximidade com o Neon de prod.
* **Storage Rules**: 
  * Comando: `npm run storage:deploy:prod`
* **Realtime DB Rules**: 
  * Comando: `npm run database:deploy:prod`

---

### 3. Padrão de Uso: Terminal vs MCP

* **Mutações de Infraestrutura (NPM)**: **Sempre** utilize o terminal do usuário via `run_command` para rodar os scripts de deploy do `package.json` (`npm run ...:prod`). Isso garante o uso das credenciais ativas e injeta as variáveis de ambiente com o `cross-env` multiplataforma de forma perfeita.
* **Inspeção e Administração (MCP)**: Use o MCP do Neon para rodar queries analíticas/administrativas (SQL), verificar conexões ou gerenciar branches. Use o MCP do Firebase para ler dados de coleções ou checar o status de deploys se necessário.
