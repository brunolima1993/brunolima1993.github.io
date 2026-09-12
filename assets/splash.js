/* A abertura e o Firebase carregam em paralelo. Não altera nem encerra a sessão. */
(() => {
  const splash = document.getElementById('splash');
  const imagem = document.getElementById('splashImage');
  if (!splash || !imagem) return;

  const CHAVE_SESSAO = 'tmycar:splash:exibida';
  const CHAVE_RETORNO_GOOGLE = 'tmycar:splash:retorno-google';
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const decisaoInicial = window.__TMYCAR_SPLASH__;
  let mostrar = decisaoInicial && decisaoInicial.decidido
    ? decisaoInicial.mostrar
    : true;

  /* Compatibilidade caso este arquivo seja usado por uma cópia antiga do
     HTML que ainda não tenha tomado a decisão no cabeçalho. */
  if (!decisaoInicial || !decisaoInicial.decidido) {
    try {
      const jaExibida = sessionStorage.getItem(CHAVE_SESSAO) === '1';
      const validade = Number(localStorage.getItem(CHAVE_RETORNO_GOOGLE) || 0);
      localStorage.removeItem(CHAVE_RETORNO_GOOGLE);
      mostrar = !jaExibida && validade <= Date.now();
      if (mostrar) sessionStorage.setItem(CHAVE_SESSAO, '1');
    } catch (e) {}
  }

  /* Atualização da página e retorno do login não são uma nova abertura. Como
     a classe `on` ainda não foi aplicada, não há nem um quadro de lampejo. */
  if (!mostrar) return;

  let appPronto = false;
  let animacaoTerminou = reduzirMovimento;
  let fechada = false;
  let tempoAnimacao;
  let limiteAbertura;

  function fechar() {
    if (fechada) return;
    fechada = true;
    clearTimeout(tempoAnimacao);
    clearTimeout(limiteAbertura);
    splash.setAttribute('aria-hidden', 'true');
    splash.classList.add('saindo');
    window.removeEventListener('tmycar:pronto', pronto);
    window.removeEventListener('pagehide', fechar);
    setTimeout(() => {
      splash.classList.remove('on');
      document.documentElement.classList.remove('tmycar-splash');
      document.documentElement.classList.add('tmycar-sem-splash');
      imagem.removeAttribute('src');
    }, reduzirMovimento ? 0 : 180);
  }

  function concluirSePronto() {
    if (appPronto && animacaoTerminou) fechar();
  }

  function terminarAnimacao() {
    animacaoTerminou = true;
    concluirSePronto();
  }

  function pronto() {
    appPronto = true;
    concluirSePronto();
  }

  splash.classList.add('on');
  window.addEventListener('tmycar:pronto', pronto);
  window.addEventListener('pagehide', fechar, { once: true });
  imagem.addEventListener('load', () => {
    tempoAnimacao = setTimeout(terminarAnimacao, 1500);
  }, { once: true });
  imagem.addEventListener('error', terminarAnimacao, { once: true });
  limiteAbertura = setTimeout(fechar, 5000);
  if (!reduzirMovimento) imagem.src = './assets/splash-tmycar.gif';
})();
