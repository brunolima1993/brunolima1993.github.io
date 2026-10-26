/* Optional native TWA bridge. No ad SDK, account identifiers or ad requests in the website. */
(function(root, factory) {
  if(typeof module === 'object' && module.exports) module.exports = factory;
  else root.TMyAdmob = factory;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAdBridge(env) {
  'use strict';
  const ORIGIN = 'https://www.tmycar.com.br';
  // Chrome can serialize its DAL-verified app source using the android-app scheme.
  // Accept only the exact origin observed on-device; never a prefix, wildcard or null.
  const ANDROID_ORIGIN = 'android-app://www.tmycar.com.br';
  const uuid = () => env.randomUUID();
  const validToken = v => typeof v === 'string' && /^[a-f0-9-]{36}$/.test(v);
  let port = null, confirmed = false, epoch = uuid(), key = null, ready = false, privacyToken = '';
  let pending = null, openingUntil = 0, disposed = false;
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
      // A cached/older Android test build must not be activated by this website.
      if(data.type!=='hello' || data.adMode!=='production') return;
      confirmed=true; refresh(); return;
    }
    if(data.type==='status') {
      if(data.adMode!=='production') return;
      ready=data.ready===true;
      privacyToken=validToken(data.privacyToken)?data.privacyToken:'';
      env.privacyChanged(!!privacyToken && data.privacyRequired===true);
    }
    if(data.type==='armed' && pending && data.request===pending.id) {
      const request=pending; pending=null; env.clearTimeout(request.timer);
      const state=read();
      const ok=state.free && state.safe && state.key===request.key && epoch===request.epoch
        && state.screen===request.screen && env.now()-request.at<=250 && env.userActive();
      ready=false;
      request.resolve(!!ok && open('maintenance',data.token));
    }
  }
  function acceptChannel(event) {
    if(disposed) return;
    if(!event.ports || !event.ports.length) return;
    if(env.origin!==ORIGIN) return;
    if(event.origin!==ORIGIN && event.origin!==ANDROID_ORIGIN) return;
    if(event.ports.length!==1) return;
    // Chrome transfers the port in an EMPTY window message. The native JSON hello
    // arrives later ON that port, not on window. Do not send state until it is checked.
    if(event.data!=='') return;
    const incoming=event.ports[0];
    if(!incoming || typeof incoming.postMessage!=='function' || typeof incoming.close!=='function') return;
    cancel(); if(port) port.close();
    port=incoming; confirmed=false; ready=false; privacyToken='';
    openingUntil=0; env.privacyChanged(false);
    port.onmessage=event=>{ if(!disposed && port===incoming) message(event); };
    if(port.start) port.start();
  }
  async function saved({persisted=true,action='maintenance'}={}) {
    if(!persisted || !['maintenance','odometer','receipt'].includes(action)) return false;
    const state=refresh();
    const routes={maintenance:['painel','servicos'],odometer:['garagem','painel'],receipt:['corrida']};
    if(state.screen && !routes[action].includes(state.screen)) return false;
    if(!port || !confirmed || !state.free || !state.safe || pending || !env.userActive()) {
      return false;
    }
    const id=uuid();
    if(!ready) { send({type:'saved',request:id,action}); return false; } // Count, but never wait for an ad to load.
    return new Promise(resolve => {
      pending={id,resolve,at:env.now(),epoch,key:state.key,screen:state.screen,timer:env.setTimeout(cancel,250)};
      if(!send({type:'saved',request:id,action})) cancel();
    });
  }
  function privacy() {
    if(!port || !privacyToken || !env.userActive()) return false;
    return open('privacy',privacyToken);
  }
  const removeListener=env.listen(acceptChannel);
  const timer=env.setInterval(refresh,2000);
  return {saved,refresh,privacy,dispose() {
    disposed=true; cancel(); env.clearInterval(timer); removeListener();
    if(port) port.close(); port=null; confirmed=false; env.privacyChanged(false);
  }};
});
