/* O mesmo service worker cuida do cache e do Firebase Messaging. Assim o push
   acorda o app mesmo quando nenhuma janela está aberta. */
importScripts(
  './vendor/firebase-12.18.0/firebase-app-compat.js',
  './vendor/firebase-12.18.0/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: 'AIzaSyBV8AaQ0YX0fl4soUT0brAcnTO37qTJxDw',
  authDomain: 'auth.tmycar.com.br',
  projectId: 'tmycar-222e5',
  storageBucket: 'tmycar-222e5.firebasestorage.app',
  messagingSenderId: '357646169698',
  appId: '1:357646169698:web:936c7aa80641b6db26c33b'
});
firebase.messaging();

const CACHE_APP = 'tmycar-pwa-v1.5.100-adaptive-android';
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
  new URL('./assets/splash.js', self.registration.scope).href,
  new URL('./assets/splash-screen-fullscreen-v2.webp', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-app-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-app-check-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-auth-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-firestore-compat.js', self.registration.scope).href,
  new URL('./vendor/firebase-12.18.0/firebase-messaging-compat.js', self.registration.scope).href,
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
    if(resposta.ok && resposta.status !== 206){
      const cache = await caches.open(CACHE_APP);
      cache.put(pedido, resposta.clone());
    }
    return resposta;
  })());
});

self.addEventListener('notificationclick', evento => {
  evento.notification.close();
  const dados = evento.notification.data || {};
  const mensagemFcm = dados.FCM_MSG || {};
  const destinoInformado = dados.url ||
    (mensagemFcm.fcmOptions && mensagemFcm.fcmOptions.link) ||
    (mensagemFcm.data && mensagemFcm.data.url) || './?abrir=avisos';
  const destino = new URL(destinoInformado, self.registration.scope).href;
  evento.waitUntil((async()=>{
    const janelas = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    const aberta = janelas.find(cliente => new URL(cliente.url).origin === self.location.origin);
    if(aberta){
      await aberta.focus();
      aberta.postMessage({ tipo:'tmycar:abrir-avisos', url:destino });
      return;
    }
    await self.clients.openWindow(destino);
  })());
});
