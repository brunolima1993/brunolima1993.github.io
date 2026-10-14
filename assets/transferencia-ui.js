(function(root){
  'use strict';
  root.TMyTransferenciaUI=function(api){
    const T=root.TMyTransferencia,$=id=>document.getElementById(id);
    $('s-config').parentElement.insertAdjacentHTML('beforeend',`<div class="screen tools-screen" id="s-transferencia"><div class="topbar"><div class="topbar-left"><button class="tools-back" id="transferBack" type="button" aria-label="Voltar">‹</button><span class="title">Exportar dados</span></div></div><div class="section">
      <p class="tools-intro">Leve o histórico de um veículo para outro celular ou entregue uma cópia ao novo dono. No outro aparelho, use esta mesma tela para importar o arquivo no TMy Car atualizado.</p>
      <form id="transferExportForm" class="tools-form"><label>Veículo<select id="transferVehicle" required></select></label><label class="transfer-check"><input type="checkbox" id="transferExpenses"> Incluir gastos deste veículo</label><button class="tools-action" id="transferGenerate" type="submit">Gerar arquivo do veículo</button></form>
      <p class="tools-note">Inclui cadastro, placa (se cadastrada) e histórico de manutenção do veículo escolhido. Não inclui sua conta, e-mail, assinatura, clientes, corridas ou outros veículos. Confira se os textos dos serviços e gastos contêm informações que você não quer compartilhar.</p>
      <div id="transferExportReady" hidden><p id="transferExportSummary" class="tools-result"></p><button class="tools-action" id="transferShare" type="button">Compartilhar arquivo</button><button class="tools-action tools-secondary" id="transferDownload" type="button">Baixar arquivo</button><p class="tools-note">O arquivo não é criptografado. Envie somente a alguém de confiança. Exportar não apaga seu carro nem transfere propriedade ou assinatura.</p></div>
      <p id="transferExportStatus" class="tools-note" role="status" aria-live="polite"></p>
      <h2 class="transfer-heading">Receber dados de um veículo</h2><p class="tools-note">Escolha um arquivo .json exportado pelo TMy Car. Você verá uma prévia antes de confirmar. A importação adiciona um veículo, sem substituir os existentes, respeitando o limite do seu plano.</p>
      <label class="tools-action tools-secondary" for="transferFile">Importar arquivo</label><input class="transfer-file" id="transferFile" type="file" accept=".json,application/json" aria-label="Selecionar arquivo do veículo">
      <div id="transferImportReady" hidden><p id="transferImportSummary" class="tools-result"></p><p class="tools-note">Dados fornecidos pelo remetente, sem verificação de autenticidade. Os lembretes de gastos virão desligados; revise os vencimentos antes de ativá-los.</p><button class="tools-action" id="transferImport" type="button">Confirmar importação</button></div>
      <p id="transferImportStatus" class="tools-note" role="status" aria-live="polite"></p>
    </div></div>`);
    let file=null,payload=null,epoch=0,busy=false,active=false;
    const status=(kind,message)=>$('transfer'+kind+'Status').textContent=message;
    function vehicles(){
      const selected=$('transferVehicle').value,state=api.state();$('transferVehicle').replaceChildren();
      state.veiculos.forEach((v,i)=>$('transferVehicle').add(new Option(v.marca+' '+v.modelo+(v.ano?' · '+v.ano:''),String(i))));
      if(selected&&state.veiculos[Number(selected)])$('transferVehicle').value=selected;
      $('transferGenerate').disabled=!state.veiculos.length;
    }
    function clearExport(){file=null;$('transferExportReady').hidden=true;$('transferExportSummary').textContent='';status('Export','');}
    function reset(){epoch++;file=null;payload=null;busy=false;$('transferExportForm').reset();$('transferVehicle').replaceChildren();$('transferFile').value='';clearExport();$('transferImportReady').hidden=true;$('transferImportSummary').textContent='';status('Import','');$('transferImport').disabled=false;}
    function render(route){
      if(route!=='transferencia'){if(active){active=false;reset();}return;}
      if(active)return;active=true;reset();
      vehicles();
      if(!api.state().veiculos.length)status('Export','Nenhum veículo cadastrado para exportar. Você pode importar um arquivo abaixo.');
    }
    function summary(p){return p.veiculo.marca+' '+p.veiculo.modelo+(p.veiculo.ano?' · '+p.veiculo.ano:'')+'\nPlaca: '+(p.veiculo.placa||'não informada')+'\nHistórico: '+p.veiculo.servicos.length+' serviço(s), além dos registros do painel de manutenção.\nGastos: '+(p.incluiGastos?p.gastos.length+' lançamento(s) · '+root.TMyFerramentas.moeda(p.gastos.reduce((sum,r)=>sum+r.valor,0)):'não incluídos');}
    $('transferBack').onclick=()=>api.go('conta-dados');
    $('transferVehicle').onchange=clearExport;$('transferExpenses').onchange=clearExport;
    $('transferExportForm').onsubmit=event=>{
      event.preventDefault();clearExport();
      try{
        const state=api.state(),index=Number($('transferVehicle').value);
        if(!state.veiculos[index])throw new Error('Escolha um veículo cadastrado.');
        const p=T.pack(state.veiculos[index],state.registros,index,$('transferExpenses').checked,crypto.randomUUID(),new Date().toISOString());
        file=new File([T.serialize(p)],'tmycar-veiculo-'+new Date().toISOString().slice(0,10)+'.json',{type:'application/json'});
        $('transferExportSummary').textContent=summary(p);$('transferExportReady').hidden=false;status('Export','Arquivo preparado. Revise a prévia e escolha compartilhar ou baixar.');
      }catch(e){status('Export',e.message);}
    };
    $('transferDownload').onclick=()=>{
      if(!file)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      status('Export','Download solicitado. Guarde o arquivo ou envie como documento pelo WhatsApp.');
    };
    $('transferShare').onclick=async()=>{
      if(!file)return;const current=epoch;
      try{if(!navigator.share||!navigator.canShare||!navigator.canShare({files:[file]})){status('Export','Compartilhamento de arquivos indisponível. Use Baixar arquivo e envie como documento.');return;}
        await navigator.share({files:[file],title:'Histórico de veículo — TMy Car'});if(current===epoch)status('Export','Arquivo entregue ao compartilhamento do aparelho.');
      }catch(e){if(current===epoch)status('Export',e.name==='AbortError'?'Compartilhamento cancelado.':'Não foi possível compartilhar. Use Baixar arquivo.');}
    };
    $('transferFile').onchange=async()=>{
      const chosen=$('transferFile').files[0],current=++epoch;payload=null;$('transferImportReady').hidden=true;status('Import','');
      if(!chosen)return;
      try{if(chosen.size>T.MAX_BYTES)throw new Error('Arquivo muito grande. O limite é 750 KB.');
        const parsed=T.parse(await chosen.text());if(current!==epoch||!active)return;
        payload=parsed;$('transferImportSummary').textContent=summary(parsed);$('transferImportReady').hidden=false;
      }catch(e){if(current===epoch)status('Import',e.message);}
    };
    $('transferImport').onclick=()=>{
      if(!payload||busy)return;const selected=payload,current=epoch,context=api.state().context;
      api.confirm('Importar veículo','Adicionar '+selected.veiculo.marca+' '+selected.veiculo.modelo+'? Seus outros dados serão mantidos. O arquivo não transfere propriedade nem Premium.',async()=>{
        if(current!==epoch||!active||api.state().context!==context)return;
        busy=true;$('transferImport').disabled=true;
        try{await api.importVehicle(selected,context);if(current===epoch){payload=null;$('transferImportReady').hidden=true;$('transferFile').value='';vehicles();clearExport();status('Import','Veículo importado e salvo neste aparelho. Ele já aparece na Garagem.');}}
        catch(e){if(current===epoch)status('Import',e.message);}
        finally{if(current===epoch){busy=false;$('transferImport').disabled=false;}}
      });
    };
    return {render,reset:()=>{active=false;reset();}};
  };
})(globalThis);
