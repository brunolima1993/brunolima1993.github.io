/* This adapter runs only in the origin-scoped Android WebMessage host. */
(function(root){
  'use strict';
  if(root.location.origin!=='https://www.tmycar.com.br' || !root.TMyAndroid) return;
  const pending=new Map();
  let sequence=0, adsPort=null, stateReader=null, lastState='', permission='default';
  function call(op,args={},timeout=30000){
    return new Promise((resolve,reject)=>{
      const id='native-'+(++sequence);
      const timer=setTimeout(()=>{pending.delete(id);reject(new Error('O Android demorou para responder. Tente novamente.'));},timeout);
      pending.set(id,{resolve,reject,timer});
      try{root.TMyAndroid.postMessage(JSON.stringify({id,op,args}));}
      catch(error){clearTimeout(timer);pending.delete(id);reject(error);}
    });
  }
  root.TMyAndroid.onmessage=event=>{
    let message; try{message=JSON.parse(event.data);}catch(_){return;}
    if(message.event==='ads'){
      if(adsPort && adsPort.onmessage) adsPort.onmessage({data:JSON.stringify(message.data)});
      return;
    }
    const request=pending.get(message.id); if(!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if(message.error){
      const error=new Error(message.error==='AbortError'?'Operação cancelada.':message.error);
      if(message.error==='AbortError'){error.name='AbortError';error.code='auth/popup-closed-by-user';}
      request.reject(error);
    }else request.resolve(message.result);
  };
  const service={
    getDetails:ids=>call('products',{ids}),
    listPurchases:()=>call('purchases')
  };
  root.getDigitalGoodsService=async method=>{
    if(method!=='https://play.google.com/billing') throw new Error('Método de pagamento indisponível.');
    return service;
  };
  root.PaymentRequest=class NativePaymentRequest{
    constructor(methods){
      if(!Array.isArray(methods)||methods.length!==1||methods[0].supportedMethods!=='https://play.google.com/billing')
        throw new Error('Método de pagamento indisponível.');
      this.data=methods[0].data; this.used=false;
    }
    async show(){
      if(this.used) throw new Error('Esta compra já foi solicitada.');
      this.used=true;
      const details=await call('buy',this.data,180000);
      // Completion does not acknowledge or grant access. Existing server verification does that.
      return {details,complete:async()=>{}};
    }
  };
  async function fileArgs(file){
    if(!file || file.size>10*1024*1024) throw new Error('Use um arquivo de até 10 MB.');
    const base64=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);
    });
    return {name:file.name||'tmycar',mime:file.type||'application/octet-stream',base64};
  }
  const supportedMime=file=>file && ['application/pdf','application/json','text/csv','image/png','image/jpeg','text/plain'].includes(file.type);
  root.navigator.canShare=data=>!!(data && data.files && data.files.length===1 && supportedMime(data.files[0]) && data.files[0].size<=10*1024*1024);
  root.navigator.share=async data=>{
    if(!root.navigator.canShare(data)) throw new Error('Formato não suportado para compartilhamento.');
    return call('share',await fileArgs(data.files[0]),180000);
  };
  async function download(url,name){
    if(!url.startsWith('blob:') || new URL(url.slice(5)).origin!==root.location.origin) throw new Error('Arquivo não permitido.');
    const response=await fetch(url),blob=await response.blob();
    return call('save',await fileArgs(new File([blob],name||'tmycar',{type:blob.type})),180000);
  }
  root.document.addEventListener('click',event=>{
    const anchor=event.target.closest && event.target.closest('a[download]');
    if(!anchor || !anchor.href.startsWith('blob:')) return;
    event.preventDefault(); download(anchor.href,anchor.download).catch(error=>{if(error.name!=='AbortError' && root.toast)root.toast(error.message);});
  },true);
  function sync(force=false){
    if(!stateReader) return;
    let state;try{state=stateReader();}catch(_){state={account:'',free:false,safe:false,nav:false};}
    const text=JSON.stringify(state);
    if(force || text!==lastState){lastState=text;call('ui',state).catch(()=>{});}
  }
  root.TMyNative={call,download,pushConfigured:false,
    signIn:()=>call('google',{},120000),
    configure(reader){stateReader=reader;sync(true);},
    sync,
    connectAds(accept){
      const port={onmessage:null,postMessage:data=>{call('ads',JSON.parse(data)).catch(()=>{});},close(){if(adsPort===port)adsPort=null;},start(){}};
      adsPort=port;
      accept({origin:root.location.origin,data:'',ports:[port]});
      queueMicrotask(()=>{if(adsPort===port && port.onmessage)port.onmessage({data:JSON.stringify({tmycarAds:1,type:'hello',adMode:'production'})});});
      return ()=>port.close();
    },
    openAd(url){
      const match=/^intent:\/\/(maintenance|privacy)\?token=([a-f0-9-]{36})#Intent;scheme=tmycar-ads;package=br\.com\.tmycar\.app;end$/.exec(url);
      if(!match) throw new Error('Anúncio inválido.');
      call('adOpen',{host:match[1],token:match[2]}).catch(()=>{});
    },
    navigate(screen){
      if(!['garagem','gastos','config'].includes(screen))return;
      const item=document.querySelector('#nav .nitem[data-n="'+screen+'"]'); if(item)item.click();sync(true);
    },
    back(){
      if(typeof telaAtual==='function' && ['garagem','bemvindo'].includes(telaAtual()))return false;
      history.back();return true;
    },
    notificationPermission:()=>permission,
    async requestNotificationPermission(){permission=await call('pushPermission');return permission;},
    notify:(title,options)=>call('notify',{title,body:options.body||'',tag:options.tag||'maintenance'})
  };
  call('hello').then(info=>{TMyNative.pushConfigured=info.pushConfigured===true;permission=info.notificationPermission;}).catch(()=>{});
  setInterval(()=>sync(true),2000);
  root.document.addEventListener('visibilitychange',()=>sync(true));
  root.document.addEventListener('DOMContentLoaded',()=>{
    const style=document.createElement('style');
    style.textContent='html,body{width:100%;height:100%;overflow:hidden;background:#04070e}body{min-height:100dvh;padding:0;display:block}.hint,.island,.statusbar,.homebar,#nav{display:none!important}.device{width:100vw;height:100dvh;max-width:none;border-radius:0;padding:0;box-shadow:none;background:#04070e}.device::before,.device::after{display:none}.viewport{border-radius:0}.screens{padding-top:0}.toast{bottom:12px!important}';
    document.head.appendChild(style);
    let scheduled=false;
    new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync();});})
      .observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
  });
})(window);
