/* Preserve installed PWAs and legacy notification links. */
(function () {
  'use strict';
  const url = new URL(window.location.href);
  const appRoute = ['avisos', 'gastos'].includes(url.searchParams.get('abrir'));
  const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const native = /TMyCarNative\//.test(window.navigator.userAgent);
  if (appRoute || installed || native) {
    const destination = new URL('./app.html', url);
    destination.search = url.search;
    destination.hash = url.hash;
    window.location.replace(destination.href);
  }
})();
