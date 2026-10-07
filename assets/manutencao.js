/* Catálogo de nomes para cadastro; os intervalos dependem do manual de cada versão. */
(function(root){
  'use strict';
  const eletricos = {
    'BYD':['Dolphin','Dolphin Mini','Yuan Plus','Yuan Pro','Seal','Tan','Han'],
    'GWM':['Ora 03'],
    'Tesla':['Model 3','Model Y','Model S','Model X'],
    'Renault':['Kwid E-Tech','Zoe','Megane E-Tech'],
    'Nissan':['Leaf'],
    'Chevrolet':['Bolt EV','Bolt EUV'],
    'Volvo':['EX30','EX40','EC40','C40','XC40 Recharge'],
    'JAC':['E-JS1','E-JS4'],
    'Peugeot':['e-208','e-2008'],
    'Fiat':['500e'],
    'BMW':['i3','i4','iX','iX1'],
    'Kia':['EV5','EV6'],
    'Hyundai':['Ioniq 5'],
    'Audi':['e-tron','Q8 e-tron'],
    'Porsche':['Taycan'],
    'Mercedes-Benz':['EQA','EQB','EQE','EQS'],
    'MINI':['Cooper SE'],
    'Ford':['Mustang Mach-E'],
    'Volkswagen':['ID.4']
  };
  const ehEletrico = v => !!v && v.propulsao === 'eletrico';
  function marcas(carros){ return [...new Set([...Object.keys(carros), ...Object.keys(eletricos)])].sort((a,b)=>a.localeCompare(b,'pt-BR')); }
  function modeloEletrico(){
    return [
      ['cabine','Filtros','Filtro de Cabine'],
      ['freio','Fluidos','Fluido de Freio'],
      ['arref_bateria','Fluidos','Arrefecimento da Bateria'],
      ['redutor','Tração elétrica','Óleo do Redutor'],
      ['bateria_tracao','Tração elétrica','Bateria de Tração'],
      ['pneus','Rodagem','Pneus e Alinhamento']
    ].map(([id,g,nome])=>({id,g,nome,ikm:null,imes:null,revisao:true,
      crit:'Conforme o manual do veículo',
      obs: id==='bateria_tracao' ? 'Registre a inspeção profissional da bateria. Não representa uma troca periódica da bateria.'
        : id==='redutor' ? 'Inspeção ou troca somente quando indicada no manual da versão.'
        : id==='arref_bateria' ? 'Aplicável aos modelos com este sistema. Serviço conforme o fabricante, por profissional qualificado.'
        : 'Defina o próximo intervalo conforme o manual e a orientação da oficina.'}));
  }
  function mudarPropulsao(v, tipo, base){
    const anterior = ehEletrico(v) ? 'eletrico' : 'combustao';
    if(anterior === tipo) return;
    // Guarda o painel anterior inteiro, inclusive revisões, sem convertê-las entre sistemas.
    v.paineisArquivados = v.paineisArquivados || {};
    v.paineisArquivados[anterior] = v.itens || [];
    v.itens = v.paineisArquivados[tipo] || base;
    delete v.paineisArquivados[tipo];
    v.propulsao = tipo;
  }
  function validarServico(servico, data, km, hoje){
    const nome = String(servico||'').trim();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(data) ? new Date(data+'T12:00:00Z') : null;
    if(!nome || nome.length > 100) return 'Informe o serviço (até 100 caracteres).';
    if(!d || !Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==data || data>hoje)
      return 'Informe uma data válida, até hoje.';
    if(!Number.isSafeInteger(km) || km<0 || km>9999999) return 'Informe a quilometragem do serviço (zero é permitido).';
    return '';
  }
  function nomeServicoPainel(item, parte){
    const filtros={oleo:'Filtro de Óleo',ar:'Filtro de Ar',comb:'Filtro de Combustível',cab:'Filtro de Cabine'};
    const nome=parte ? (filtros[parte.id] || 'Filtro de '+parte.nome) : item.nome;
    return (item.revisao ? 'Revisão — ' : 'Troca — ')+nome;
  }
  function registrarPainel(v, item, partes, km, data, criarId){
    v.servicos=Array.isArray(v.servicos)?v.servicos:[];
    const alvos=item.partes ? item.partes.filter(p=>(partes||[]).includes(p.id)) : [null];
    alvos.forEach(p=>v.servicos.push({id:criarId(),servico:nomeServicoPainel(item,p),km,data}));
  }
  function importarUltimosRegistros(v){
    if(v.historicoPainelImportado) return;
    v.servicos=Array.isArray(v.servicos)?v.servicos:[];
    const paineis=[v.itens||[],...Object.values(v.paineisArquivados||{})];
    paineis.forEach((itens,painel)=>itens.forEach(item=>(item.partes||[null]).forEach(parte=>{
      const registro=parte||item, data=registro.ultData;
      if(!data || validarServico('Registro',data,0,'9999-12-31')) return;
      const km=Number.isSafeInteger(registro.ultKm) && registro.ultKm>=0 ? registro.ultKm : null;
      const id=`anterior:${painel}:${item.id}:${parte?parte.id:''}:${data}:${km}`;
      if(!v.servicos.some(r=>r.id===id)) v.servicos.push({id,servico:nomeServicoPainel(item,parte),data,km});
    })));
    v.historicoPainelImportado=true;
  }
  function gruposServicos(registros, ano){
    const meses = new Map();
    (registros||[]).filter(r=>!ano || r.data.slice(0,4)===String(ano))
      .slice().sort((a,b)=>b.data.localeCompare(a.data) || b.id.localeCompare(a.id)).forEach(r=>{
        const mes = r.data.slice(0,7);
        if(!meses.has(mes)) meses.set(mes,new Map());
        const dias = meses.get(mes);
        if(!dias.has(r.data)) dias.set(r.data,[]);
        dias.get(r.data).push(r);
      });
    return [...meses].map(([mes,dias])=>({mes,dias:[...dias].map(([data,itens])=>({data,itens}))}));
  }
  const api = {eletricos,ehEletrico,marcas,modeloEletrico,mudarPropulsao,validarServico,gruposServicos,nomeServicoPainel,registrarPainel,importarUltimosRegistros};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.TMyManutencao=api;
})(typeof globalThis==='object' ? globalThis : this);
