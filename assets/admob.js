/* Optional native TWA bridge. No ad SDK, account identifiers or ad requests in the website. */
/* TEMPORARY DIAGNOSTIC BUILD (1.6.3-diag-1): same behavior as 1.6.3-production, plus
   memory-only counters read by Ajustes > Conta e dados. Never stores message bodies,
   tokens, raw origins or personal data. Remove after the investigation. */
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

  /* ---- diagnostics (memory only, fixed labels) ---- */
  const diag = {
    windowMessages:0, transfers:0, rejected:0, lastTransfer:'nenhuma desde que o app abriu',
    portMessages:0, lastPortEvent:'nenhuma', helloMode:'nenhuma recebida',
    statusAt:null, stateSends:0, sendErrors:0, savesSent:0, saveLog:[],
    attempts:0, attemptAt:null, statusAfterAttempt:0, lateArmed:0
  };
  function hora() {
    try { return new Date().toLocaleTimeString('pt-BR'); } catch(_) { return ''; }
  }
  function logSave(label) {
    diag.saveLog.push(hora()+' — '+label);
    if(diag.saveLog.length>6) diag.saveLog.shift();
  }
  function originLabel(origin) {
    if(origin===ORIGIN) return 'HTTPS TMyCar';
    if(origin==='android-app://www.tmycar.com.br/br.com.tmycar.app') return 'android-app TMyCar com pacote';
    if(origin===ANDROID_ORIGIN) return 'android-app TMyCar sem pacote';
    if(origin==='null' || origin==='') return 'opaca ou vazia';
    return 'outra origem';
  }
  function dataLabel(data) {
    return data===''?'texto vazio':data===null?'nulo':typeof data==='string'?'texto nao vazio':'outro tipo';
  }
  function diagnostics() {
    const state=read();
    const now=env.now();
    const age=diag.statusAt===null?null:Math.max(0,Math.floor((now-diag.statusAt)/1000));
    return {
      scriptVersion:'1.6.3-diag-1',
      channel:disposed?'encerrado':(!port?'aguardando o Android':(!confirmed?'canal recebido; aguardando identificação do Android':(diag.statusAt===null?'conectado; sem resposta de estado':(now-diag.statusAt>10000?'SEM RESPOSTA RECENTE do Android':'conectado e respondendo')))),
      helloMode:diag.helloMode,
      free:state.free===true,
      ready:diag.statusAt!==null && now-diag.statusAt<=10000 && ready,
      statusAgeSeconds:age,
      transfers:diag.transfers, rejected:diag.rejected, lastTransfer:diag.lastTransfer,
      portMessages:diag.portMessages, lastPortEvent:diag.lastPortEvent,
      stateSends:diag.stateSends, sendErrors:diag.sendErrors,
      savesSent:diag.savesSent, saveLog:diag.saveLog.slice(),
      attempts:diag.attempts,
      attemptAgeSeconds:diag.attemptAt===null?null:Math.max(0,Math.floor((now-diag.attemptAt)/1000)),
      statusAfterAttempt:diag.statusAfterAttempt,
      lateArmed:diag.lateArmed
    };
  }
  /* ---- end diagnostics ---- */

  function read() {
    try { return env.getState(); } catch(_) { return {free:false,safe:false,key:null}; }
  }
  function send(message) {
    if(!port || !confirmed || disposed) return false;
    try {
      port.postMessage(JSON.stringify({...message,tmycarAds:1,epoch}));
      if(message.type==='state') diag.stateSends++;
      if(message.type==='saved') diag.savesSent++;
      return true;
    }
    catch(_) { diag.sendErrors++; ready=false; return false; }
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
    diag.portMessages++;
    let data;
    try { if(typeof event.data !== 'string' || event.data.length>2048) { diag.lastPortEvent='tipo ou tamanho recusado'; return; } data=JSON.parse(event.data); }
    catch(_) { diag.lastPortEvent='JSON inválido'; return; }
    if(!data || data.tmycarAds!==1) { diag.lastPortEvent='protocolo recusado'; return; }
    if(!confirmed) {
      // A cached/older Android test build must not be activated by this website.
      if(data.type!=='hello' || data.adMode!=='production') {
        diag.helloMode=data.type!=='hello'?'mensagem antes da identificação':
          (data.testMode===true?'versão de TESTE (recusada)':'modo ausente (recusada)');
        diag.lastPortEvent='identificação recusada';
        return;
      }
      diag.helloMode='produção (aceita)';
      diag.lastPortEvent='identificação aceita';
      confirmed=true; refresh(); return;
    }
    if(data.type==='status') {
      if(data.adMode!=='production') { diag.lastPortEvent='estado sem modo produção (ignorado)'; return; }
      diag.lastPortEvent='estado recebido';
      diag.statusAt=env.now();
      if(diag.attemptAt!==null) diag.statusAfterAttempt++;
      ready=data.ready===true;
      privacyToken=validToken(data.privacyToken)?data.privacyToken:'';
      env.privacyChanged(!!privacyToken && data.privacyRequired===true);
    }
    if(data.type==='armed' && !(pending && data.request===pending.id)) {
      // Unwaited replies with an empty token are normal (ad not loaded). Only a real,
      // non-empty authorization arriving after the 250 ms window is worth counting.
      if(validToken(data.token)) { diag.lateArmed++; diag.lastPortEvent='autorização chegou depois do prazo'; }
      else diag.lastPortEvent='resposta sem autorização';
    }
    if(data.type==='armed' && pending && data.request===pending.id) {
      diag.lastPortEvent='autorização recebida';
      const request=pending; pending=null; env.clearTimeout(request.timer);
      const state=read();
      const elapsed=env.now()-request.at;
      const active=env.userActive();
      const ok=state.free && state.safe && state.key===request.key && epoch===request.epoch
        && elapsed<=250 && active;
      ready=false;
      let opened=false;
      if(!validToken(data.token)) {
        logSave('Android NÃO autorizou (precisa de 2 manutenções, 5 min de intervalo, anúncio carregado e tela certa)');
      } else if(!ok) {
        const why=!state.free?'conta deixou de ser elegível':!state.safe?'tela mudou':
          (state.key!==request.key || epoch!==request.epoch)?'conta mudou':
          elapsed>250?'resposta levou '+Math.round(elapsed)+' ms':'toque expirou';
        logSave('Android autorizou, mas o site cancelou: '+why);
      } else {
        opened=open('maintenance',data.token);
        if(opened) {
          diag.attempts++; diag.attemptAt=env.now(); diag.statusAfterAttempt=0;
          logSave('Android autorizou; site CHAMOU a tela do anúncio');
        } else {
          logSave('Android autorizou, mas o site não conseguiu chamar a tela (toque expirou)');
        }
      }
      request.resolve(!!ok && opened);
    }
  }
  function acceptChannel(event) {
    if(disposed) return;
    diag.windowMessages++;
    if(!event.ports || !event.ports.length) return;
    diag.transfers++;
    const shape=originLabel(event.origin)+'; '+dataLabel(event.data)+'; canais: '+Math.min(event.ports.length,9);
    const reject=reason=>{ diag.rejected++; diag.lastTransfer=shape+'; recusada: '+reason; };
    if(env.origin!==ORIGIN) { reject('página fora do domínio'); return; }
    if(event.origin!==ORIGIN && event.origin!==ANDROID_ORIGIN) { reject('origem diferente da permitida'); return; }
    if(event.ports.length!==1) { reject('quantidade de canais'); return; }
    // Chrome transfers the port in an EMPTY window message. The native JSON hello
    // arrives later ON that port, not on window. Do not send state until it is checked.
    if(event.data!=='') { reject('mensagem inicial não vazia'); return; }
    const incoming=event.ports[0];
    if(!incoming || typeof incoming.postMessage!=='function' || typeof incoming.close!=='function') { reject('canal inválido'); return; }
    diag.lastTransfer=shape+'; aceita';
    cancel(); if(port) port.close();
    port=incoming; confirmed=false; ready=false; privacyToken='';
    diag.statusAt=null; diag.helloMode='aguardando';
    openingUntil=0; env.privacyChanged(false);
    port.onmessage=event=>{ if(!disposed && port===incoming) message(event); };
    if(port.start) port.start();
  }
  async function saved({persisted=true}={}) {
    if(!persisted) { logSave('registro não confirmado no armazenamento local'); return false; }
    const state=refresh();
    if(!port || !confirmed || !state.free || !state.safe || pending || !env.userActive()) {
      logSave(!port || !confirmed?'sem conexão com o Android':!state.free?'conta não elegível':
        !state.safe?'tela não permitida':pending?'tentativa já em andamento':'toque expirou antes de avisar o Android');
      return false;
    }
    const id=uuid();
    if(!ready) { // Count, but never wait for an ad to load.
      send({type:'saved',request:id});
      logSave('aviso enviado; anúncio ainda NÃO estava carregado');
      return false;
    }
    return new Promise(resolve => {
      pending={id,resolve,at:env.now(),epoch,key:state.key,timer:env.setTimeout(()=>{
        logSave('Android não respondeu em 250 ms'); cancel();
      },250)};
      if(!send({type:'saved',request:id})) { logSave('falha ao avisar o Android'); cancel(); }
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
