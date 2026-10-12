/* Optional native TWA bridge. No ad SDK, account identifiers or ad requests in the website. */
(function(root, factory) {
  if(typeof module === 'object' && module.exports) module.exports = factory;
  else root.TMyAdmob = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAdBridge(env) {
  'use strict';
  const ORIGIN = 'https://www.tmycar.com.br';
  const uuid = () => env.randomUUID();
  const validToken = v => typeof v === 'string' && /^[a-f0-9-]{36}$/.test(v);
  let port = null, confirmed = false, epoch = uuid(), key = null, ready = false, privacyToken = '';
  let pending = null, openingUntil = 0, disposed = false;
  let statusAt = null, lastSave = 'nenhum evento nesta sessao';
  // Memory-only counters and fixed labels. Never retain message bodies or raw origins.
  let windowMessages=0, transfers=0, rejected=0, portMessages=0, stateSends=0, sendErrors=0;
  let lastTransfer='nenhuma desde a inicializacao do script', lastPortEvent='nenhuma';
  function originLabel(origin) {
    if(origin===ORIGIN) return 'HTTPS TMyCar';
    if(origin==='android-app://www.tmycar.com.br/br.com.tmycar.app') return 'android-app TMyCar com pacote';
    if(origin==='android-app://www.tmycar.com.br') return 'android-app TMyCar sem pacote';
    if(origin==='null' || origin==='') return 'opaca ou vazia';
    return 'outra origem';
  }
  function dataLabel(data) {
    return data===''?'texto vazio':data===null?'nulo':typeof data==='string'?'texto nao vazio':'outro tipo';
  }
  function diagnostics() {
    const state=read();
    return {
      channel:disposed?'encerrado':(!port?'aguardando Android':(!confirmed?'canal recebido; aguardando identificacao Android':(statusAt===null?'conectado; sem resposta de estado':(env.now()-statusAt>10000?'sem resposta recente':'respondendo')))),
      free:state.free===true, safe:state.safe===true,
      ready:statusAt!==null && env.now()-statusAt<=10000 && ready,
      statusAgeSeconds:statusAt===null?null:Math.max(0,Math.floor((env.now()-statusAt)/1000)),
      lastSave, scriptVersion:'1.6.2-diag-4', windowMessages, transfers, rejected,
      lastTransfer, portMessages, lastPortEvent, stateSends, sendErrors
    };
  }
  function read() {
    try { return env.getState(); } catch(_) { return {free:false,safe:false,key:null}; }
  }
  function send(message) {
    if(!port || !confirmed || disposed) return false;
    try { port.postMessage(JSON.stringify({...message,tmycarAds:1,epoch})); if(message.type==='state') stateSends++; return true; }
    catch(_) { sendErrors++; ready=false; return false; }
  }
  function refresh() {
    const state = read();
    if(key !== state.key) { key=state.key; epoch=uuid(); ready=false; cancel(); }
    if(!state.free) { ready=false; cancel(); }
    // Chrome becomes hidden while the capability's foreground Activity is opening.
    // Preserve only this short, already-authorized transition; account changes still revoke it.
    if(state.free && env.now() < openingUntil) return state;
    send({type:'state',free:state.free===true,safe:state.safe===true});
    return state;
  }
  function cancel() {
    if(pending) { env.clearTimeout(pending.timer); pending.resolve(false); pending=null; }
  }
  function open(host, token) {
    if(!validToken(token) || !env.userActive()) return false;
    openingUntil=env.now()+1500;
    try {
      env.navigate('intent://'+host+'?token='+encodeURIComponent(token)+
        '#Intent;scheme=tmycar-ads;package=br.com.tmycar.app;end');
      return true;
    } catch(_) { openingUntil=0; return false; }
  }
  function message(event) {
    portMessages++;
    let data;
    try { if(typeof event.data !== 'string' || event.data.length>2048) {lastPortEvent='tipo ou tamanho recusado';return;} data=JSON.parse(event.data); }
    catch(_) { lastPortEvent='JSON invalido';return; }
    if(!data || data.tmycarAds!==1) {lastPortEvent='protocolo recusado';return;}
    if(!confirmed) {
      if(data.type!=='hello' || data.testMode!==true) {lastPortEvent='identificacao de teste ausente';return;}
      lastPortEvent='identificacao Android aceita';
      confirmed=true; refresh(); return;
    }
    lastPortEvent=data.type==='status'?'estado recebido':data.type==='armed'?'resposta de autorizacao recebida':'tipo ignorado';
    if(data.type==='status') {
      statusAt=env.now();
      ready=data.ready===true && data.testMode===true;
      privacyToken=validToken(data.privacyToken)?data.privacyToken:'';
      env.privacyChanged(!!privacyToken && data.privacyRequired===true);
    }
    if(data.type==='armed' && pending && data.request===pending.id) {
      const request=pending; pending=null; env.clearTimeout(request.timer);
      const state=read();
      const ok=state.free && state.safe && state.key===request.key && epoch===request.epoch
        && env.now()-request.at<=250 && env.userActive();
      ready=false;
      lastSave=ok && validToken(data.token)?'autorizacao recebida; tentativa de abertura':'Android nao autorizou ou contexto mudou';
      request.resolve(!!ok && open('maintenance',data.token));
    }
  }
  function acceptChannel(event) {
    if(disposed) return;
    windowMessages++;
    if(!event.ports || !event.ports.length) return;
    transfers++;
    const shape=originLabel(event.origin)+'; '+dataLabel(event.data)+'; canais: '+Math.min(event.ports.length,9);
    const reject=reason=>{rejected++;lastTransfer=shape+'; recusada: '+reason;};
    if(env.origin!==ORIGIN) {reject('pagina fora do dominio permitido');return;}
    if(event.origin!==ORIGIN) {reject('origem diferente da permitida');return;}
    if(event.ports.length!==1) {reject('quantidade de canais');return;}
    // Chrome transfers the port in an EMPTY window message. The native JSON hello
    // arrives later ON that port, not on window. Do not send state until it is checked.
    if(event.data!=='') {reject('mensagem inicial nao vazia');return;}
    const incoming=event.ports[0];
    if(!incoming || typeof incoming.postMessage!=='function' || typeof incoming.close!=='function') {reject('canal invalido');return;}
    lastTransfer=shape+'; aceita';
    cancel(); if(port) port.close();
    port=incoming; confirmed=false; ready=false; privacyToken='';
    statusAt=null; openingUntil=0; env.privacyChanged(false);
    port.onmessage=event=>{ if(!disposed && port===incoming) message(event); };
    if(port.start) port.start();
  }
  async function saved() {
    const state=refresh();
    if(!port || !confirmed || !state.free || !state.safe || pending || !env.userActive()) {
      lastSave=!port || !confirmed?'sem canal Android':!state.free?'conta nao elegivel':!state.safe?'tela bloqueada':pending?'tentativa em andamento':'gesto de toque expirou';
      return false;
    }
    lastSave=ready?'solicitando autorizacao':'evento enviado; anuncio ainda nao pronto';
    const id=uuid();
    if(!ready) { send({type:'saved',request:id}); return false; } // Count, but never wait for an ad to load.
    return new Promise(resolve => {
      pending={id,resolve,at:env.now(),epoch,key:state.key,timer:env.setTimeout(()=>{lastSave='Android nao respondeu em 250 ms';cancel();},250)};
      if(!send({type:'saved',request:id})) cancel();
    });
  }
  function privacy() {
    if(!port || !privacyToken || !env.userActive()) return false;
    return open('privacy',privacyToken);
  }
  const removeListener=env.listen(acceptChannel);
  const timer=env.setInterval(refresh,2000);
  return {saved,refresh,privacy,diagnostics,dispose() {
    disposed=true; cancel(); env.clearInterval(timer); removeListener();
    if(port) port.close(); port=null; confirmed=false; env.privacyChanged(false);
  }};
});
