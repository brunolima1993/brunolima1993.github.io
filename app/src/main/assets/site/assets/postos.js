(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TMyPostos=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Each finder owns its DOM IDs, location requests and navigation lifecycle.
  function finder(route,term,label,singular,prefix){
  const DEFAULT_QUERY=term+' perto de mim';
  function urls(key,city,coords){
    let query=DEFAULT_QUERY,center='';
    if(coords){
      const {latitude,longitude}=coords;
      if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new Error('Localização inválida. Busque pela cidade.');
      center=latitude.toFixed(4)+','+longitude.toFixed(4);
      query=term+' perto de '+center;
    }else if(city){
      const text=String(city).trim().replace(/\s+/g,' ');
      if(text.length<2||text.length>120)throw new Error('Informe a cidade ou bairro (de 2 a 120 caracteres).');
      query=term+' em '+text;
    }
    const external=new URL('https://www.google.com/maps/search/');
    external.search=new URLSearchParams({api:'1',query}).toString();
    let embed='';
    if(typeof key==='string'&&/^AIza[\w-]{35}$/.test(key.trim())){
      const map=new URL('https://www.google.com/maps/embed/v1/search');
      map.search=new URLSearchParams({key:key.trim(),q:query,language:'pt-BR',region:'BR',...(center?{center,zoom:'14'}:{})}).toString();
      embed=map.href;
    }
    return {external:external.href,embed};
  }
  const html=('<p class="tools-intro">Encontre um '+singular+' perto de você ou busque em outra cidade ou bairro.</p>'+
    '<button class="tools-action" id="toolsMapLocation" type="button">Encontrar '+label+' perto de mim</button>'+
    '<p class="tools-note">Ao buscar, o Google recebe o local informado. Sua localização só é solicitada ao tocar no botão e não é salva pelo TMy Car.</p>'+
    '<form id="toolsMapForm" class="tools-form"><label>Buscar em outra cidade ou bairro<input id="toolsMapCity" maxlength="120" minlength="2" placeholder="Ex.: Campinas, SP" required></label><button class="tools-action tools-secondary" type="submit">Buscar '+label+' no mapa</button></form>'+
    '<p id="toolsMapStatus" class="tools-note" role="status" aria-live="polite"></p><div id="toolsMapContainer" class="tools-map" hidden></div>'+
    '<a class="tools-action tools-secondary" id="toolsMaps" href="'+urls('').external.replace(/&/g,'&amp;')+'" target="_blank" rel="noopener noreferrer">Abrir no Google Maps</a>'+
    '<p class="tools-note">Toque em um '+singular+' no mapa para ver os detalhes. Para traçar uma rota ou se o mapa não aparecer, use Abrir no Google Maps.</p>').replaceAll('id="toolsMap','id="'+prefix);
  function create(doc,nav,config){
    const $=id=>doc.getElementById(id.replace(/^toolsMap/,prefix));
    let active=false,request=0;
    const ready=()=>Boolean(urls(config.embedApiKey).embed);
    const initial=()=>ready()?'Busque um local para carregar o mapa.':'O mapa interno está em preparação. Você já pode buscar e abrir os resultados no Google Maps.';
    function clear(){request++;$('toolsMapLocation').disabled=false;$('toolsMapContainer').replaceChildren();$('toolsMapContainer').hidden=true;$('toolsMaps').href=urls('').external;}
    function show(city,coords){
      if(!active)return;
      try{
        const links=urls(config.embedApiKey,city,coords);
        $('toolsMaps').href=links.external;
        $('toolsMapContainer').replaceChildren();$('toolsMapContainer').hidden=true;
        if(!links.embed){$('toolsMapStatus').textContent='Mapa interno ainda não configurado. Toque em Abrir no Google Maps para ver os resultados.';return;}
        const frame=doc.createElement('iframe');frame.title='Google Maps — '+term;frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;frame.src=links.embed;
        $('toolsMapContainer').append(frame);$('toolsMapContainer').hidden=false;
        // Cross-origin frames do not expose API errors; never report load as verified success.
        $('toolsMapStatus').textContent='Mapa solicitado. Se não aparecer, confira a conexão ou abra no Google Maps.';
      }catch(e){$('toolsMapStatus').textContent=e.message;}
    }
    $('toolsMapForm').addEventListener('submit',event=>{event.preventDefault();request++;$('toolsMapLocation').disabled=false;show($('toolsMapCity').value);});
    $('toolsMapLocation').addEventListener('click',()=>{
      if(!active)return;
      if(!nav.geolocation){$('toolsMapStatus').textContent='Localização indisponível. Busque pela cidade ou bairro.';return;}
      const id=++request;$('toolsMapLocation').disabled=true;$('toolsMapStatus').textContent='Aguardando permissão e localização…';
      const current=()=>active&&id===request;
      const failed=error=>{if(!current())return;$('toolsMapLocation').disabled=false;$('toolsMapStatus').textContent=error.code===1?'Localização não autorizada. Você pode buscar pela cidade ou bairro.':'Não foi possível obter sua localização. Busque pela cidade ou tente novamente.';};
      try{nav.geolocation.getCurrentPosition(position=>{if(!current())return;$('toolsMapLocation').disabled=false;show('',position.coords);},failed,{enableHighAccuracy:false,timeout:10000,maximumAge:60000});}catch(e){failed(e);}
    });
    return {
      render(currentRoute){if(currentRoute===route){if(!active){active=true;$('toolsMapStatus').textContent=initial();}}else if(active){active=false;clear();}},
      reset(){active=false;clear();$('toolsMapForm').reset();$('toolsMapStatus').textContent=initial();}
    };
  }
  return {urls,html,create};
  }
  return {...finder('postos','postos de combustíveis','postos','posto','toolsMap'),restaurantes:finder('restaurantes','restaurantes','restaurantes','restaurante','toolsRestaurantMap')};
});
