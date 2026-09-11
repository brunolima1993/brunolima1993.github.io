const CACHE_APP = 'tmycar-pwa-v1.5.89-splash-1';
const INICIO = new URL('./', self.registration.scope).href;
const HTML_PRINCIPAL = new URL('./index.html', self.registration.scope).href;
const VIDEO_SPLASH = new URL('./assets/splash-tmycar.mp4', self.registration.scope).href;
const ARQUIVOS_APP = [
  INICIO,
  HTML_PRINCIPAL,
  new URL('./termos.html', self.registration.scope).href,
  new URL('./politica.html', self.registration.scope).href,
  new URL('./excluir-conta.html', self.registration.scope).href,
  new URL('./manifest.webmanifest', self.registration.scope).href,
  new URL('./icons/icon-192.png', self.registration.scope).href,
  new URL('./icons/icon-512.png', self.registration.scope).href,
  new URL('./icons/icon-maskable-512.png', self.registration.scope).href,
  new URL('./icons/apple-touch-icon.png', self.registration.scope).href,
  new URL('./assets/splash.js', self.registration.scope).href,
  new URL('./assets/splash-tmycar-poster.jpg', self.registration.scope).href,
  VIDEO_SPLASH,
  new URL('./vendor/firebase-12.18.0/firebase-app-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-app-check-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-auth-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-firestore-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-functions-compat.js', self.registration.scope).href
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_APP)
      .then(cache => cache.addAll(ARQUIVOS_APP))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves
        .filter(chave => chave.startsWith('tmycar-pwa-') && chave !== CACHE_APP)
        .map(chave => caches.delete(chave))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  const url = new URL(pedido.url);
  if(pedido.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navegadores pedem trechos do MP4. Servir 206 permite a reprodução offline.
  if(url.href === VIDEO_SPLASH && pedido.headers.has('range')){
    evento.respondWith((async()=>{
      const salva = await caches.match(VIDEO_SPLASH);
      if(!salva) return fetch(pedido);
      const dados = await salva.arrayBuffer();
      const intervalo = /^bytes=(\d*)-(\d*)$/i.exec(pedido.headers.get('range').trim());
      const tamanho = dados.byteLength;
      let inicio = NaN, fim = NaN;
      if(intervalo && (intervalo[1] || intervalo[2])){
        inicio = intervalo[1] ? Number(intervalo[1]) : Math.max(0, tamanho - Number(intervalo[2]));
        fim = intervalo[1] && intervalo[2] ? Math.min(Number(intervalo[2]), tamanho - 1) : tamanho - 1;
      }
      if(!Number.isSafeInteger(inicio) || !Number.isSafeInteger(fim) || inicio < 0 || inicio > fim || inicio >= tamanho)
        return new Response(null, {status:416, headers:{'Content-Range':`bytes */${tamanho}`}});
      return new Response(dados.slice(inicio, fim + 1), {status:206, headers:{
        'Content-Type':'video/mp4', 'Accept-Ranges':'bytes',
        'Content-Range':`bytes ${inicio}-${fim}/${tamanho}`, 'Content-Length':String(fim - inicio + 1)
      }});
    })());
    return;
  }

  if(pedido.mode === 'navigate'){
    evento.respondWith((async()=>{
      try{
        const resposta = await fetch(pedido);
        if(resposta.ok){
          const cache = await caches.open(CACHE_APP);
          cache.put(pedido, resposta.clone());
        }
        return resposta;
      }catch(e){
        return (await caches.match(pedido)) || (await caches.match(HTML_PRINCIPAL)) || (await caches.match(INICIO));
      }
    })());
    return;
  }

  evento.respondWith((async()=>{
    const salva = await caches.match(pedido);
    if(salva) return salva;
    const resposta = await fetch(pedido);
    if(resposta.ok && resposta.status !== 206){
      const cache = await caches.open(CACHE_APP);
      cache.put(pedido, resposta.clone());
    }
    return resposta;
  })());
});
