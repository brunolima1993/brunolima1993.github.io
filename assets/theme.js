(function(){
  'use strict';
  const key='tmycar_tema';
  // Vector alternatives avoid the dark pixels baked into the legacy PNGs.
  const paths={bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',calendar:'M8 3v4M16 3v4M4 10h16M7 14h3M14 14h3M7 18h3M14 18h3'};
  window.TMyThemeIcon=n=>paths[n]?'<svg class="theme-icon-vector" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(n==='calendar'?'<rect x="4" y="5" width="16" height="17" rx="2"/>':'')+'<path d="'+paths[n]+'"/></svg>':'';
  function apply(theme,persist){
    theme=theme==='light'?'light':'dark';
    const previous=document.documentElement.dataset.theme;
    document.documentElement.dataset.theme=theme;
    document.querySelectorAll('[data-tema]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tema===theme)));
    const sub=document.getElementById('tmTemaSub');if(sub)sub.textContent=theme==='light'?'Claro':'Escuro';
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='light'?'#eaf1ff':'#02294B';
    if(persist)try{localStorage.setItem(key,theme);}catch(_){}
    if(previous!==theme)window.dispatchEvent(new CustomEvent('tmycar:theme-changed',{detail:{theme}}));
  }
  let saved='dark';try{saved=localStorage.getItem(key);}catch(_){}
  apply(saved,false);
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-tema]').forEach(b=>b.addEventListener('click',()=>apply(b.dataset.tema,true)));
    apply(document.documentElement.dataset.theme,false);
  });
  window.addEventListener('storage',e=>{if(e.key===key)apply(e.newValue,false);});
})();
