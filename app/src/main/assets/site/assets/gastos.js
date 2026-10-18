(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TMyGastos=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const AGENDAVEIS=['ipva','multas','seguro'];
  function dataValida(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function fase(vencimento,hoje){
    if(!dataValida(vencimento)||!dataValida(hoje))return null;
    const dias=Math.round((Date.parse(vencimento+'T12:00:00Z')-Date.parse(hoje+'T12:00:00Z'))/86400000);
    return dias===7?'7-dias':dias===0?'vence-hoje':null;
  }
  const pago=registro=>registro.pago!==false; // Legacy expenses were all paid.
  function validar(d){
    if(!Number.isInteger(d.valor)||d.valor<=0||d.valor>999999999)throw new Error('Informe um valor válido maior que zero.');
    if(!dataValida(d.data))throw new Error('Informe uma data válida.');
    if(AGENDAVEIS.includes(d.tipo)&&!dataValida(d.vencimento))throw new Error('Informe um vencimento válido.');
    return true;
  }
  return {AGENDAVEIS,dataValida,fase,pago,validar};
});
