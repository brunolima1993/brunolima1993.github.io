/* TMy Car — service worker
   O app inteiro cabe num arquivo, então o cache é simples: guarda a casca
   e serve offline. A FIPE nunca é cacheada: valor velho seria pior que
   nenhum valor. */

/* Suba este número junto com o VERSAO_APP do index.html a cada publicação.
   É o que faz o cache antigo ser descartado no lugar de ficar servindo
   arquivos velhos. */
const VERSAO = 'tmycar-1.3.24';
const CASCA = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSAO)
      .then(c => c.addAll(CASCA))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // um recurso ausente não pode travar a instalação
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  /* consultas externas (FIPE, Firebase) vão sempre à rede e nunca entram no cache */
  if(url.origin !== self.location.origin) return;

  /* navegação: tenta a rede e cai no cache quando estiver offline */
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(r => {
          const copia = r.clone();
          caches.open(VERSAO).then(c => c.put('./index.html', copia));
          return r;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* demais arquivos do próprio app: cache primeiro, rede como reserva */
  e.respondWith(
    caches.match(req).then(cacheado => cacheado || fetch(req).then(r => {
      if(r && r.status === 200 && r.type === 'basic'){
        const copia = r.clone();
        caches.open(VERSAO).then(c => c.put(req, copia));
      }
      return r;
    }).catch(() => cacheado))
  );
});
