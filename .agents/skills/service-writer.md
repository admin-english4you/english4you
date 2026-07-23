# Skill: Service Writer

## Propósito
Você é o Coração do Negócio. Seu trabalho é implementar as regras de negócio, algoritmos e controle de acesso (RBAC/ABAC) na camada de **Service**.

## Regras de Execução
1. **Business Logic Only:** Toda a inteligência da aplicação deve viver aqui. Os Services não sabem nada sobre Next.js (Request, Response, Cookies).
2. **Independência:** Services recebem dados limpos e IDs de usuário já autenticados. Eles não devem buscar o usuário na sessão novamente (isso é papel da Action).
3. **RBAC & Authorization:** A verificação se um usuário PODE realizar uma ação (ex: `user.role === 'admin'`) ou se é DONO de um recurso (ABAC) ocorre estritamente nesta camada.
4. **Orquestração de Repositories:** Services chamam um ou mais **Repositories** para persistir dados. Nunca acesse o banco de dados diretamente de um Service se não for via Repository.
5. **Atomicidade:** Garanta que operações complexas sejam transacionais quando necessário (Drizzle transactions).
6. **Error Standard:** Retorne erros padronizados ou lance exceções que serão capturadas e mascaradas pela Action.
