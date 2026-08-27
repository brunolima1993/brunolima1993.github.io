# Segurança do Firebase — primeira publicação

Estes arquivos deixam as regras no projeto e evitam depender apenas da configuração visual do Console Firebase.

## 1. Publicar primeiro as regras

Abra o terminal nesta pasta e execute:

```powershell
firebase.cmd use tmycar-222e5
firebase.cmd deploy --only firestore:rules,storage
```

Depois, no Console Firebase, abra **Firestore Database → Regras** e confirme que a versão publicada corresponde ao arquivo `firestore.rules`.

As regras permitem que cada e-mail confirmado leia e altere apenas `usuarios/{próprio UID}`. Os documentos de `assinaturas/{UID}` são somente leitura para o usuário e só poderão ser escritos pelo servidor.

## 2. Ativar App Check

No Console Firebase:

1. Abra **App Check**.
2. Selecione o aplicativo Web do TMy Car.
3. Escolha **reCAPTCHA Enterprise**.
4. Cadastre os domínios `tmycar.com.br`, `www.tmycar.com.br` e `auth.tmycar.com.br`.
5. Primeiro acompanhe as métricas; depois ative a aplicação obrigatória para Firestore e, quando existirem, Cloud Functions e Storage.

## 3. Reforçar Authentication

Em **Authentication → Configurações**:

- exija senha com pelo menos 10 caracteres, maiúscula, minúscula e número;
- habilite proteção contra enumeração de e-mails;
- mantenha somente os domínios realmente usados em **Domínios autorizados**;
- revise cotas do Identity Toolkit conforme o volume normal do aplicativo.

## 4. Restringir a chave pública

No Google Cloud, abra **APIs e serviços → Credenciais**. A chave Web do Firebase pode permanecer no aplicativo, mas deve aceitar somente as APIs necessárias do Firebase. Não coloque FIPE paga, Mercado Pago, Google Play, chave privada ou conta de serviço no HTML.

## 5. Publicar o site com cabeçalhos

Quando o certificado do domínio estiver ativo, publique o Hosting:

```powershell
firebase.cmd deploy --only hosting
```

O arquivo `firebase.json` adiciona HTTPS/HSTS, proteção contra iframe, `nosniff`, política de referência, permissões restritas e uma CSP inicialmente em modo de relatório. A CSP só deverá ser colocada em modo obrigatório depois de retirar scripts, estilos e eventos inline.

## Ainda pendente antes de cobrar

O Premium visual continua sendo um comportamento de protótipo local. Antes de aceitar dinheiro, uma Cloud Function deve validar a identidade, iniciar o teste de 14 dias uma única vez e atualizar `assinaturas/{UID}`. Compras da Google Play também precisam ser confirmadas no servidor antes de liberar o plano.
