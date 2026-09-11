/* A abertura e o Firebase carregam em paralelo. Não altera nem encerra a sessão. */
(() => {
  const splash = document.getElementById('splash');
  const video = document.getElementById('splashVideo');
  if (!splash || !video) return;

  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let appPronto = false;
  let animacaoTerminou = reduzirMovimento;
  let fechada = false;
  let limiteVideo;
  let limiteAbertura;

  function fechar() {
    if (fechada) return;
    fechada = true;
    clearTimeout(limiteVideo);
    clearTimeout(limiteAbertura);
    video.pause();
    splash.setAttribute('aria-hidden', 'true');
    splash.classList.add('saindo');
    window.removeEventListener('tmycar:pronto', pronto);
    window.removeEventListener('pagehide', fechar);
    setTimeout(() => {
      splash.classList.remove('on');
      video.removeAttribute('src');
      video.load();
    }, reduzirMovimento ? 0 : 180);
  }

  function concluirSePronto() {
    if (appPronto && animacaoTerminou) fechar();
  }

  function terminarAnimacao() {
    animacaoTerminou = true;
    clearTimeout(limiteVideo);
    video.pause();
    concluirSePronto();
  }

  function pronto() {
    appPronto = true;
    concluirSePronto();
  }

  window.addEventListener('tmycar:pronto', pronto);
  window.addEventListener('pagehide', fechar, { once: true });
  video.addEventListener('ended', terminarAnimacao, { once: true });
  video.addEventListener('error', terminarAnimacao, { once: true });
  // Falha de mídia usa o pôster; uma falha de inicialização também não prende a tela.
  limiteAbertura = setTimeout(fechar, 16000);
  if (!reduzirMovimento) {
    limiteVideo = setTimeout(terminarAnimacao, 3000);
    video.muted = true;
    video.src = './assets/splash-tmycar.mp4';
    const reproducao = video.play();
    if (reproducao && typeof reproducao.catch === 'function')
      reproducao.catch(terminarAnimacao);
  }
})();
