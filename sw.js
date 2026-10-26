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

const CACHE_APP = 'tmycar-pwa-v1.6.18-web.20261025-apresentacao-v4';
const INICIO = new URL('./', self.registration.scope).href;
const HTML_PRINCIPAL = new URL('./index.html', self.registration.scope).href;
const HTML_APP = new URL('./app.html', self.registration.scope).href;
const ARQUIVOS_APP = [
  INICIO,
  HTML_PRINCIPAL,
  HTML_APP,
  new URL('./assets/site.css?v=3', self.registration.scope).href,
  new URL('./assets/site.js?v=2', self.registration.scope).href,
  new URL('./assets/site-route.js?v=1', self.registration.scope).href,
  new URL('./assets/theme.js?v=3', self.registration.scope).href,
  new URL('./assets/theme.css?v=3', self.registration.scope).href,
  new URL('./termos.html', self.registration.scope).href,
  new URL('./politica.html', self.registration.scope).href,
  new URL('./excluir-conta.html', self.registration.scope).href,
  new URL('./manifest.webmanifest', self.registration.scope).href,
  new URL('./icons/icon-192.png', self.registration.scope).href,
  new URL('./icons/icon-512.png', self.registration.scope).href,
  new URL('./icons/icon-maskable-512.png', self.registration.scope).href,
  new URL('./icons/apple-touch-icon.png', self.registration.scope).href,
  new URL('./assets/splash.js', self.registration.scope).href,
  new URL('./assets/manutencao.js?v=2', self.registration.scope).href,
  new URL('./assets/ferramentas.js?v=5', self.registration.scope).href,
  new URL('./assets/ferramentas-ui.js?v=10', self.registration.scope).href,
  new URL('./assets/ferramentas.css?v=9', self.registration.scope).href,
  new URL('./assets/transferencia.js?v=1', self.registration.scope).href,
  new URL('./assets/transferencia-ui.js?v=1', self.registration.scope).href,
  new URL('./assets/gastos.js?v=1', self.registration.scope).href,
  new URL('./assets/postos.js?v=7', self.registration.scope).href,
  new URL('./assets/admob.js?v=20261021-actions', self.registration.scope).href,
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
        const app = url.pathname === new URL(HTML_APP).pathname || ['avisos','gastos'].includes(url.searchParams.get('abrir'));
        return (await caches.match(pedido)) || (await caches.match(app ? HTML_APP : HTML_PRINCIPAL)) || (await caches.match(INICIO));
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
  let destino;
  try {
    const url = new URL(destinoInformado, self.registration.scope);
    if(url.hostname === 'tmycar.com.br')url.hostname='www.tmycar.com.br';
    if(url.username || url.password || !['https://www.tmycar.com.br',self.location.origin].includes(url.origin))throw new Error('Destino inválido');
    if(['/', '/index.html'].includes(url.pathname))url.pathname=new URL(HTML_APP).pathname;
    destino = url.href;
  } catch(e) { destino = new URL('./app.html?abrir=avisos',self.registration.scope).href; }
  evento.waitUntil((async()=>{
    const janelas = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    const mesmaOrigem = janelas.filter(cliente => new URL(cliente.url).origin === self.location.origin);
    const aberta = mesmaOrigem.find(cliente => new URL(cliente.url).pathname === new URL(HTML_APP).pathname);
    if(aberta){
      await aberta.focus();
      aberta.postMessage({ tipo:'tmycar:abrir-avisos', url:destino });
      return;
    }
    const pagina = mesmaOrigem.find(cliente => cliente.navigate);
    if(pagina){const navegada=await pagina.navigate(destino);if(navegada){await navegada.focus();return;}}
    await self.clients.openWindow(destino);
  })());
});
