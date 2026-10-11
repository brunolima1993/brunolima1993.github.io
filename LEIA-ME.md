# TMyCar — integração AdMob de teste 1.6.0 (código 1600)

## Situação da entrega

Código implementado, ainda NÃO homologado em aparelho e NÃO pronto para produção.
Nenhum arquivo foi publicado no GitHub, no AdMob ou no Google Play por esta tarefa.
O AAB novo NÃO foi gerado: o processo AAPT2 encerrou inesperadamente durante a ligação dos recursos, tanto no projeto original quanto na cópia de compilação. A causa exata desse encerramento não foi confirmada. Não renomeie nem reaproveite o AAB 1.5.99 como se contivesse esta integração.

Verificações concluídas:

- 90 testes automatizados de JavaScript/backend passaram.
- Teste no Chrome local: cadastro, edição, histórico, elétrico/híbrido/combustão e larguras 320/390/768 passaram; sem conexão ao Firebase real.
- Fontes Java compilaram separadamente com as dependências locais e SDK Android 36; teste Java da regra de frequência passou. Isso NÃO substitui a montagem do AAB, o teste de ciclo de vida Android ou a exibição de anúncio em aparelho.
- Quatro certificados existentes foram preservados no assetlinks.json, inclusive a assinatura atual da Google Play. Foi acrescentada a relação `common.use_as_origin` para a comunicação verificada com o Android.

## O que está implementado

- Mantém TWA, o domínio www.tmycar.com.br e as dependências/serviços de pagamento existentes.
- Intersticial apenas depois de uma nova manutenção ser gravada localmente, inclusive itens do painel. Edição de um registro manual não exibe anúncio.
- Pelo menos duas manutenções salvas entre tentativas, intervalo mínimo de cinco minutos persistido no Android e nenhum anúncio na abertura.
- Conta com assinatura ainda desconhecida, Premium, teste Premium e modo local ficam sem anúncios. O modo local foi excluído por segurança nesta primeira versão.
- Não exibe durante formulários, ofertas, compras, em segundo plano, após erro de gravação nem após uma espera longa. Se o anúncio não estiver pronto, segue normalmente.
- Comunicação pela sessão TWA validada. O intent que abre a tela nativa leva somente uma autorização aleatória, descartável e de curta duração, não e-mail, UID, dados de veículo, token Firebase ou compra.
- O UMP consulta as preferências antes de solicitar anúncios. Se for necessário obter consentimento, os anúncios ficam bloqueados e aparece “Preferências de anúncios” em Dados da conta. Essa opção abre a tela nativa por ação do usuário. Não há consentimento presumido ou formulário aberto em segundo plano.
- O primeiro pacote tem o ID do seu aplicativo AdMob, mas as solicitações usam EXCLUSIVAMENTE o bloco oficial de teste do Google. O bloco real está registrado no código como referência, sem utilização e sem chave remota para ativá-lo.

IDs informados:

- Aplicativo: `ca-app-pub-7049820367239374~1115140617`
- Bloco real, ainda desativado: `ca-app-pub-7049820367239374/1029575780`
- Bloco efetivamente usado neste pacote: `ca-app-pub-3940256099942544/1033173712` (teste)

## Conteúdo do ZIP

- `android/`: projeto Android completo para compilação, sem senhas, keystore, AAB antigo ou dados do Firebase.
- `site/`: SOMENTE os arquivos web alterados. Não é uma cópia integral do site. Preserve os demais arquivos existentes.
- `LEIA-ME.md`: estas instruções.

## Próxima etapa: gerar o AAB fora do ambiente de execução do assistente

1. Extraia o ZIP em uma pasta curta. Não execute dentro do ZIP.
2. Entre em `android` e execute `GERAR-AAB-ADMOB-TESTE.bat` no Windows. O script procura o Java/SDK já utilizados nesta máquina se as variáveis não estiverem definidas. A primeira execução pode baixar dependências oficiais.
3. Se terminar com sucesso, o resultado será `android/app/build/outputs/bundle/release/app-release.aab`, versão 1.6.0, código 1600. Ainda precisa ser assinado com SUA chave de upload. Não envie a senha ou a chave no chat.
4. Se falhar, envie o erro. Não publique arquivo antigo nem tente corrigir usando uma chave nova.
5. Depois da compilação e assinatura, publicar os arquivos de `site` nos mesmos caminhos do repositório do site: `index.html`, `sw.js`, `politica.html`, `assets/admob.js` e `.well-known/assetlinks.json`. A pasta deve continuar se chamando literalmente `.well-known`.
6. Confirmar que o JSON publicado contém as duas relações e os quatro certificados; depois enviar o AAB para TESTE INTERNO, não produção. Instalar pela Google Play com a conta testadora.

O ZIP não altera o app publicado sozinho. Atualizar apenas o site não adiciona o SDK Android ao aplicativo 1.5.99.

## Checklist obrigatório no aparelho

- Abrir pelo ícone: a barra X/compartilhar não deve retornar. Se retornar, parar e verificar o domínio/assinatura; não publicar.
- Abrir e cancelar o pagamento Premium; testar restauração com conta testadora de licença. Confirmar que a assinatura e a volta ao app continuam funcionando.
- Em conta Free confirmada, salvar duas manutenções distintas, aguardando o pré-carregamento entre elas. Confirmar anúncio com identificação de teste, fechar e conferir ambos os registros no histórico.
- Salvar novamente antes de cinco minutos: não deve mostrar outro anúncio. Após o intervalo, exigir também duas novas manutenções desde a última tentativa.
- Conta Premium e teste de 14 dias: não devem solicitar/exibir anúncios. Trocar de conta e repetir.
- Sem internet, sem anúncio disponível, armazenamento indisponível e retorno do segundo plano: não pode aparecer anúncio tardio, sumir registro ou travar a navegação.
- Testar botão Voltar, fechar anúncio, girar aparelho, abrir link de anúncio de teste, reabrir pelo ícone e matar/restaurar o processo.
- Configurar e testar as mensagens de privacidade no AdMob. Se o UMP exigir consentimento, abrir Dados da conta → Preferências de anúncios. Testar também recusa e revisão das escolhas. Não simular consentimento por código em produção.

## Antes de ativar anúncios reais

Ainda precisam de confirmação na conta: associação com a loja, situação/aprovação do app AdMob, mensagens de privacidade, público-alvo e restrições de conteúdo. Atualize “Contém anúncios” e a declaração de Segurança dos dados no Play Console conforme o SDK efetivamente integrado. Revise o texto de privacidade incluído antes de publicar; ele não substitui avaliação jurídica.

Copie o trecho EXATO de AdMob → Apps → Todos os aplicativos → app-ads.txt → Como configurar. Precisaremos publicá-lo em `/app-ads.txt` do site de desenvolvedor que consta na loja e verificar o rastreamento. Esse arquivo não foi inventado ou publicado nesta entrega.

Só depois de a versão de teste funcionar no aparelho, mudar deliberadamente para o bloco real, gerar outro AAB com código superior e realizar a liberação. Não clique em anúncios reais para testar.

## Referências oficiais

- TWA/postMessage e relação de origem: https://developer.chrome.com/docs/android/post-message-twa
- Consentimento UMP: https://developers.google.com/admob/android/privacy
- Anúncios de teste: https://developers.google.com/admob/android/test-ads
- Declaração de dados do SDK: https://developers.google.com/admob/android/privacy/play-data-disclosure
- app-ads.txt: https://support.google.com/admob/answer/9363762?hl=pt-BR
- SDK 25.4 mantém Android 6 (API 23); 25.5 aumenta o mínimo: https://developers.google.com/admob/android/rel-notes
