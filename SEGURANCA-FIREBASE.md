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

## 2. App Check — aplicado e validado

O aplicativo Web usa reCAPTCHA Enterprise e inicializa o App Check antes de
Authentication e Firestore. A fiscalização obrigatória já foi aplicada e
testada para **Authentication** e **Cloud Firestore**. Arquivos abertos por
`file:///` não recebem atestação; os testes integrados devem usar o endereço
HTTPS publicado.

## 3. Authentication — aplicado e validado

Em **Authentication → Configurações**:

- exija pelo menos 12 e no máximo 128 caracteres para novas senhas;
- permita frases, espaços e caracteres especiais sem regras artificiais de composição;
- mantenha habilitada a proteção contra enumeração de e-mails;
- mantenha somente os domínios realmente usados em **Domínios autorizados**;
- revise cotas do Identity Toolkit conforme o volume normal do aplicativo.

O aplicativo preserva o login de contas antigas e não informa se um endereço
de e-mail já está cadastrado.

## 4. Dependências Web

O Firebase JavaScript SDK está fixado na versão `12.18.0` para App, App Check,
Authentication, Cloud Firestore e Cloud Functions. A interface `compat` foi mantida nesta etapa
para isolar o risco da atualização. A migração para a API modular deve ser
feita separadamente, com novos testes de regressão.

## 5. Restringir a chave pública

No Google Cloud, abra **APIs e serviços → Credenciais**. A chave Web do Firebase pode permanecer no aplicativo, mas deve aceitar somente as APIs necessárias do Firebase. Não coloque FIPE paga, Mercado Pago, Google Play, chave privada ou conta de serviço no HTML.

## 6. Publicar o site com cabeçalhos

Quando o certificado do domínio estiver ativo, publique o Hosting:

```powershell
firebase.cmd deploy --only hosting
```

O arquivo `firebase.json` adiciona HTTPS/HSTS, proteção contra iframe, `nosniff`, política de referência, permissões restritas e uma CSP inicialmente em modo de relatório. A CSP só deverá ser colocada em modo obrigatório depois de retirar scripts, estilos e eventos inline.

## 7. Assinatura e teste grátis — base segura pronta

O plano não é mais aceito do `localStorage` nem de `usuarios/{UID}`. O app lê
`assinaturas/{UID}` e a função `ativarTesteGratis` valida Auth, e-mail confirmado
e App Check antes de liberar os 14 dias. Uma transação também impede repetir o
benefício com o mesmo e-mail. Consulte `ASSINATURAS-FIREBASE.md` para publicar.

## Ainda pendente antes de cobrar

As compras mensal e anual continuam bloqueadas. A próxima etapa financeira é
integrar a Google Play Billing e fazer o servidor validar cada compra antes de
atualizar `assinaturas/{UID}`. O HTML nunca deve aceitar recibo ou plano sem essa
validação do lado do servidor.
