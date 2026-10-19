(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.TMyPostos=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function finder(term,label,singular,id){
    // A normal user-initiated link opens Maps outside the TMyCar page.
    // No iframe, API key, popup timer or local geolocation permission is needed.
    const url=new URL('https://www.google.com/maps/search/');
    url.search=new URLSearchParams({api:'1',query:term+' perto de mim'}).toString();
    const html='<p class="tools-intro">Encontre um '+singular+' próximo e veja os detalhes e rotas no Google Maps.</p>'+
      '<a class="tools-action" id="'+id+'" href="'+url.href.replace(/&/g,'&amp;')+'" target="_blank" rel="noopener noreferrer">Encontrar '+label+' perto de mim</a>'+
      '<p class="tools-note">O Google Maps abre em outra janela ou no aplicativo Maps, conforme as configurações do celular. Você também pode pesquisar outra cidade ou bairro diretamente no Maps.</p>'+
      '<p class="tools-note">Se o Google Maps solicitar sua localização, você pode permitir para encontrar locais próximos. O TMyCar não solicita nem salva sua localização nesta busca.</p>';
    return {html,url:url.href};
  }
  return {...finder('postos de combustíveis','postos','posto','toolsMapLocation'),restaurantes:finder('restaurantes','restaurantes','restaurante','toolsRestaurantMapLocation')};
});
