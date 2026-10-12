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
  function diagnostics() {
    const state=read();
    return {
      channel:disposed?'encerrado':(!port?'aguardando Android':(!confirmed?'canal recebido; aguardando identificacao Android':(statusAt===null?'conectado; sem resposta de estado':(env.now()-statusAt>10000?'sem resposta recente':'respondendo')))),
      free:state.free===true, safe:state.safe===true,
      ready:statusAt!==null && env.now()-statusAt<=10000 && ready,
      statusAgeSeconds:statusAt===null?null:Math.max(0,Math.floor((env.now()-statusAt)/1000)),
      lastSave
    };
  }
  function read() {
    try { return env.getState(); } catch(_) { return {free:false,safe:false,key:null}; }
  }
  function send(message) {
    if(!port || !confirmed || disposed) return false;
    try { port.postMessage(JSON.stringify({...message,tmycarAds:1,epoch})); return true; }
    catch(_) { ready=false; return false; }
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
    let data;
    try { if(typeof event.data !== 'string' || event.data.length>2048) return; data=JSON.parse(event.data); }
    catch(_) { return; }
    if(!data || data.tmycarAds!==1) return;
    if(!confirmed) {
      if(data.type!=='hello' || data.testMode!==true) return;
      confirmed=true; refresh(); return;
    }
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
    if(disposed || env.origin!==ORIGIN || event.origin!==ORIGIN || !event.ports || event.ports.length!==1) return;
    // Chrome transfers the port in an EMPTY window message. The native JSON hello
    // arrives later ON that port, not on window. Do not send state until it is checked.
    if(event.data!=='') return;
    const incoming=event.ports[0];
    if(!incoming || typeof incoming.postMessage!=='function' || typeof incoming.close!=='function') return;
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
