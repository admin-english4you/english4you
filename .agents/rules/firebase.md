---
trigger: always_on
---

# SECURITY: Firebase & External Services

This rule ensures that the agent always prioritizes security and synchronization when working with Firebase (Storage, Auth, Firestore) or any external binary storage.

## 📌 Protocolo de Manutenção de Regras

1. **Sempre Verifique `storage.rules`**: Antes de adicionar qualquer funcionalidade de upload no frontend, o agente DEVE verificar se existe uma regra correspondente no arquivo `storage.rules`.
2. **NUNCA deixe `allow read, write: if true`**: Regras globais abertas são proibidas. Sempre utilize `request.auth.uid` para restringir acesso a recursos do usuário.
3. **Validação de Payload (Storage)**: Sempre inclua validação de `size` e `contentType` nas regras de Storage para evitar ataques de DoS ou execução de scripts maliciosos (SVG, etc).
4. **Sincronização de Schema**: Toda alteração no Firebase que impacte o estado do usuário deve ser seguida por um `syncUserAction` ou semelhante para manter o Neon DB atualizado conforme o padrão "Sanduíche".

## 🛠️ Fluxo de Trabalho de Alteração
Ao ser solicitado para criar um novo upload:
1. Analise o caminho do arquivo (ex: `/documents/{userId}/...`).
2. Adicione a regra em `storage.rules`.
3. Instrua o usuário a rodar `npm run storage:deploy` se as alterações manuais no console não forem desejadas. //Verifique o package.json
4. Documente a nova regra no `walkthrough`.

## 🛡️ Rate Limiting
Toda Server Action que interage com Firebase ou DB deve considerar a implementação de Rate Limiting para evitar abusos, especialmente em endpoints de mutação.
