# TMy Car — pacote PWA para a Play Store

## O que tem aqui

```
index.html               o app inteiro
manifest.webmanifest     identidade do app para o Android
sw.js                    funcionamento offline
icons/                   ícones 192, 512, 1024 e as versões maskable
```

Suba **todos** no seu repositório, na raiz, mantendo a pasta `icons/`.

---

## Atenção: o endereço precisa ser uma raiz

Para empacotar em TWA, o Google exige um arquivo em
`https://SEU-DOMINIO/.well-known/assetlinks.json` — sempre na **raiz do domínio**,
nunca dentro de uma subpasta.

Num repositório de projeto (`usuario.github.io/tmycar/`) você não controla a raiz.
Duas saídas:

1. **Renomear o repositório para `SEUUSUARIO.github.io`.** O site passa a ficar em
   `https://seuusuario.github.io/` e você controla a raiz. É o caminho mais simples.
2. **Usar domínio próprio** apontando para o GitHub Pages.

O `assetlinks.json` é gerado no passo do empacotamento (abaixo) e prova que
o site e o app pertencem a você.

---

## Passo a passo do empacotamento

### 1. Confira o PWA
Abra o site publicado no Chrome do computador, tecle F12 → aba **Lighthouse** →
categoria **Progressive Web App**. A nota precisa ficar **em 80 ou mais**.

### 2. Gere o pacote
Vá em **pwabuilder.com**, cole o endereço do site e escolha empacotar para Android.
Ele devolve um `.aab` (o arquivo que a loja aceita) e o `assetlinks.json`.

Alternativa por linha de comando, se preferir: `npx @bubblewrap/cli init --manifest
https://SEU-SITE/manifest.webmanifest` e depois `npx @bubblewrap/cli build`.

### 3. Publique o assetlinks.json
Coloque o arquivo em `.well-known/assetlinks.json` na raiz do site e confirme que
ele abre pelo navegador. Sem isso, o app abre com a barra do Chrome aparecendo.

### 4. Play Console
- Conta de desenvolvedor: taxa única de US$ 25
- Verificação de identidade: leva de 2 a 7 dias úteis
- Pessoa física pode ter conta individual (CNPJ só para conta de organização)
- Envie o `.aab` primeiro no **teste interno**, para você mesmo instalar

### 5. Teste fechado
Se sua conta foi criada depois de 13/11/2023, é obrigatório: **12 testadores
reais, em aparelhos Android físicos, por 14 dias consecutivos**, com uso natural.

Emuladores e contas falsas são detectados e podem custar o banimento da conta.

---

## O que preparar para a ficha da loja

- Ícone 512×512 → use `icons/icon-512.png`
- Imagem de destaque 1024×500 → **ainda não existe**
- Capturas de tela do app (mínimo 2)
- **Política de privacidade numa página pública** → hoje o texto só existe
  dentro do app; a loja exige um endereço acessível
- Formulário de segurança de dados
- Classificação indicativa
- Público-alvo: 18 anos ou mais

---

## Antes de subir, decida uma coisa

O app mostra preços de assinatura (R$ 3,99 e R$ 29,99), mas **nada é cobrado** —
não há integração de pagamento. Publicar assim pode confundir o testador e
levantar dúvida na revisão.

Para a fase de teste, o mais limpo é deixar o Premium liberado e sem preço,
tratando-o como recurso em avaliação. A cobrança entra quando houver
Faturamento Play integrado.
