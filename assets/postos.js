(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TMyPostos=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function finder(term,label,singular,id){
    // Android opens its own isolated MapActivity; browsers keep a new-tab fallback.
    // No iframe, API key, popup timer or local geolocation permission is needed.
    const url=new URL('https://www.google.com/maps/search/');
    url.search=new URLSearchParams({api:'1',query:term+' perto de mim'}).toString();
    const html='<p class="tools-intro">Encontre um '+singular+' próximo e veja os detalhes e rotas no Google Maps.</p>'+
      '<a class="tools-action" id="'+id+'" data-map-kind="'+(id==='toolsMapLocation'?'postos':'restaurantes')+'" href="'+url.href.replace(/&/g,'&amp;')+'" target="_blank" rel="noopener noreferrer">Encontrar '+label+' perto de mim</a>'+
      '<p class="tools-note">No Android atualizado, o Google Maps abre em uma tela própria do TMyCar, com o botão Voltar no topo. No navegador, abre em outra aba. Você também pode pesquisar outra cidade ou bairro diretamente no Maps.</p>'+
      '<p class="tools-note">Você pode autorizar sua localização aproximada para o Google Maps encontrar locais próximos. O TMyCar não salva sua localização nesta busca.</p>';
    return {html,url:url.href};
  }
  return {...finder('postos de combustíveis','postos','posto','toolsMapLocation'),restaurantes:finder('restaurantes','restaurantes','restaurante','toolsRestaurantMapLocation')};
});
