(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.TMyTransferencia=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_BYTES=750000;
  const fail=()=>{throw new Error('Arquivo inválido ou incompatível. Exporte novamente pelo TMy Car.');};
  const object=v=>{if(!v||typeof v!=='object'||Array.isArray(v))fail();return v;};
  function text(v,max=200,required=false){
    if(v==null&&!required)return '';
    if(typeof v!=='string'||v.length>max||(required&&!v.trim())||/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))fail();
    return v;
  }
  function number(v,max=9999999){if(v==null)return null;if(!Number.isSafeInteger(v)||v<0||v>max)fail();return v;}
  function date(v,required=false){
    if(!v&&!required)return null;
    if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))fail();
    const d=new Date(v+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==v)fail();return v;
  }
  function list(v,max){if(!Array.isArray(v)||v.length>max)fail();return v;}
  function id(v){const s=text(v,180,true);if(!/^[\w:.-]+$/.test(s))fail();return s;}
  function item(raw,part=false){
    const v=object(raw),out={id:id(v.id),nome:text(v.nome,100,true)};
    for(const k of ['g','crit','obs','oleo','oleoUsado','fluidoUsado','tipo'])if(v[k]!=null)out[k]=text(v[k],1000);
    for(const k of ['ikm','imes','ultKm','proxFixo'])if(k in v)out[k]=number(v[k]);
    if('ultData'in v)out.ultData=date(v.ultData);
    for(const k of ['revisao','brando'])if(k in v){if(typeof v[k]!=='boolean')fail();out[k]=v[k];}
    if(v.partes!=null){if(part)fail();out.partes=list(v.partes,30).map(p=>item(p,true));}
    return out;
  }
  function vehicle(raw){
    const v=object(raw),out={marca:text(v.marca,100,true),modelo:text(v.modelo,180,true),km:number(v.km),itens:list(v.itens||[],50).map(x=>item(x))};
    for(const k of ['ano','cilTxt','motorNome','oleo','cambio'])if(v[k]!=null)out[k]=text(v[k],200);
    out.placa=text(v.placa,12);if(out.placa&&!/^[a-zA-Z0-9 -]+$/.test(out.placa))fail();
    out.cor=v.cor||'#1F4FA8';if(!/^#[a-fA-F0-9]{6}$/.test(out.cor))fail();
    out.propulsao=v.propulsao||'combustao';if(!['combustao','hibrido','eletrico'].includes(out.propulsao))fail();
    if(v.criadoEm)out.criadoEm=date(v.criadoEm);
    out.servicos=list(v.servicos||[],2000).map(s=>{object(s);return {id:id(s.id),servico:text(s.servico,200,true),data:date(s.data,true),km:number(s.km)};});
    if(v.paineisArquivados){object(v.paineisArquivados);out.paineisArquivados={};for(const k of ['combustao','eletrico'])if(v.paineisArquivados[k])out.paineisArquivados[k]=list(v.paineisArquivados[k],50).map(x=>item(x));}
    out.historicoPainelImportado=v.historicoPainelImportado===true;
    return out;
  }
  function expense(raw){
    const r=object(raw),out={veic:0,data:date(r.data,true),valor:number(r.valor,999999999),nome:text(r.nome,120,true),desc:text(r.desc,1000),km:number(r.km)};
    if(out.valor===null||out.valor===0)fail();
    for(const k of ['item','tipo'])if(r[k]!=null)out[k]=id(r[k]);
    if(out.tipo&&!['manutencao','combustivel','ipva','multas','seguro','outros'].includes(out.tipo))fail();
    out.manual=r.manual===true;out.pago=r.pago!==false;out.lembrete=false;
    out.vencimento=date(r.vencimento);if(!out.pago&&!out.vencimento)fail();
    return out;
  }
  function validate(raw){
    object(raw);
    if(raw.formato!=='tmycar-veiculo'||raw.versao!==1||typeof raw.incluiGastos!=='boolean')fail();
    const out={formato:'tmycar-veiculo',versao:1,id:id(raw.id),criadoEm:text(raw.criadoEm,40,true),incluiGastos:raw.incluiGastos,veiculo:vehicle(raw.veiculo),gastos:list(raw.gastos,2000).map(expense)};
    if(!Number.isFinite(Date.parse(out.criadoEm))||(!out.incluiGastos&&out.gastos.length))fail();
    return out;
  }
  function serialize(data){const s=JSON.stringify(validate(data),null,2);if(new TextEncoder().encode(s).length>MAX_BYTES)throw new Error('O histórico é grande demais para este arquivo (máximo 750 KB).');return s;}
  function parse(s){if(typeof s!=='string'||new TextEncoder().encode(s).length>MAX_BYTES)fail();let raw;try{raw=JSON.parse(s);}catch(e){fail();}return validate(raw);}
  function pack(v,registros,index,includeExpenses,exportId,now){
    const out=validate({formato:'tmycar-veiculo',versao:1,id:exportId,criadoEm:now,incluiGastos:includeExpenses===true,veiculo:v,gastos:includeExpenses?registros.filter(r=>r.veic===index):[]});
    serialize(out);return out;
  }
  function checkImport(data,vehicles,records,limit,pending){
    if(pending)throw new Error('Aguarde a confirmação do seu plano antes de importar.');
    const p=validate(data),plate=s=>String(s||'').replace(/[^a-z0-9]/gi,'').toUpperCase();
    if(vehicles.some(v=>v.transferenciaId===p.id||(plate(p.veiculo.placa)&&plate(v.placa)===plate(p.veiculo.placa))))throw new Error('Este arquivo ou um veículo com essa placa já está cadastrado. Nenhum dado foi alterado.');
    if(vehicles.length>=3||vehicles.filter(v=>!v.inativo).length>=limit)throw new Error('Não há vaga para outro veículo no seu plano. Nenhum carro será substituído.');
    if(records.length+p.gastos.length>2000)throw new Error('A importação ultrapassaria o limite de gastos. Nenhum dado foi alterado.');
    return p;
  }
  return {MAX_BYTES,vehicle,validate,parse,serialize,pack,checkImport};
});
