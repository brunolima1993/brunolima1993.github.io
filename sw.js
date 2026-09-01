const CACHE_APP = 'tmycar-pwa-v1.5.77';
const INICIO = new URL('./', self.registration.scope).href;
const HTML_PRINCIPAL = new URL('./index.html', self.registration.scope).href;
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
    if(resposta.ok){
      const cache = await caches.open(CACHE_APP);
      cache.put(pedido, resposta.clone());
    }
    return resposta;
  })());
});
