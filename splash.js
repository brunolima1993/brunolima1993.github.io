/* Tela estática e vetorial: cobre a abertura até o app decidir a rota correta. */
(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;

  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fechada = false;
  let limiteAbertura;

  function fechar() {
    if (fechada) return;
    fechada = true;
    clearTimeout(limiteAbertura);
    splash.setAttribute('aria-hidden', 'true');
    splash.classList.add('saindo');
    window.removeEventListener('tmycar:rota-pronta', fechar);
    window.removeEventListener('tmycar:pronto', fechar);
    window.removeEventListener('pagehide', fechar);
    setTimeout(() => {
      splash.classList.remove('on');
      document.documentElement.classList.remove('tmycar-splash');
      document.documentElement.classList.add('tmycar-sem-splash');
    }, reduzirMovimento ? 0 : 140);
  }

  splash.classList.add('on');
  window.addEventListener('tmycar:rota-pronta', fechar);
  window.addEventListener('tmycar:pronto', fechar);
  window.addEventListener('pagehide', fechar, { once: true });
  /* Nunca prende a pessoa numa tela de abertura se um serviço externo falhar. */
  limiteAbertura = setTimeout(fechar, 8000);
})();
