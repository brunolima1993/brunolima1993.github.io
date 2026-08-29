# Assinaturas e teste grátis

O app lê o plano exclusivamente de `assinaturas/{uid}`. O navegador não pode
gravar nessa coleção. A função `ativarTesteGratis` é a única responsável por
liberar os 14 dias e usa uma transação para impedir ativações repetidas.

## Publicar a função

Cloud Functions exige que o projeto Firebase esteja no plano Blaze.

### Opção mais simples

Extraia o ZIP, abra a pasta e dê dois cliques em `PUBLICAR-ASSINATURAS.cmd`.
Ele publica somente a função de teste grátis e as regras do Firestore; não altera
o site hospedado no GitHub.

### Pelo terminal

No PowerShell, dentro desta pasta:

```powershell
cd functions
npm install
cd ..
firebase.cmd deploy --only functions:ativarTesteGratis,firestore:rules
```

Depois do deploy, abra o app publicado, entre numa conta confirmada e toque em
`Ativar 14 dias grátis`. O Firestore deverá criar:

- `assinaturas/{uid}` com `plano: premium`, `ciclo: teste` e `status: ativo`;
- um registro interno em `beneficiosTeste`, invisível ao usuário.

Chrome e Safari passam a acompanhar o mesmo documento em tempo real. Planos
mensal e anual continuarão bloqueados até a integração com a Google Play, que
deverá atualizar `assinaturas/{uid}` por um servidor confiável.
