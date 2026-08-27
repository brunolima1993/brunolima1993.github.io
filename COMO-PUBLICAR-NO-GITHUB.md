# Publicar o TMy Car no GitHub Pages

Esta pasta já contém o site completo. Envie **o conteúdo desta pasta** para a raiz do repositório que publica o TMy Car.

1. No GitHub, abra o repositório do site.
2. Envie `index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `CNAME` e a pasta `icons`.
3. Em **Settings → Pages**, escolha **Deploy from a branch**, a branch `main` e a pasta `/ (root)`.
4. Aguarde a publicação e abra `https://www.tmycar.com.br`.
5. No celular, use **Adicionar à tela inicial** ou **Instalar aplicativo** no menu do navegador.

O arquivo `CNAME` está configurado para `www.tmycar.com.br`, de acordo com o domínio que já aponta para o GitHub Pages. Se você publicar apenas em um endereço do tipo `usuario.github.io/repositorio`, remova o arquivo `CNAME`.

## Importante sobre o login Google

No Firebase Authentication, mantenha `tmycar.com.br` e `www.tmycar.com.br` em **Domínios autorizados**. O domínio técnico de autenticação continua sendo `auth.tmycar.com.br`.

O app pode abrir e consultar os dados já salvos sem conexão. Login Google, sincronização com o Firebase e consultas externas continuam precisando de internet.
