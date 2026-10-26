(function(root){
  'use strict';
  root.TMyFerramentasUI=function(api){
    const F=root.TMyFerramentas,$=id=>document.getElementById(id);
    const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
    const screen=(id,title,body,back='ferramentas')=>'<div class="screen tools-screen" id="s-'+id+'"><div class="topbar"><div class="topbar-left"><button type="button" class="tools-back" data-back="'+back+'" aria-label="Voltar">'+icon('M15 5l-7 7 7 7')+'</button><span class="title">'+title+'</span></div></div><div class="section">'+body+'</div></div>';
    const card=(dest,title,sub)=>'<button type="button" class="tools-card" data-tool="'+dest+'"><span><strong>'+title+'</strong><small>'+sub+'</small></span></button>';
    const markup=screen('ferramentas','Ferramentas','<p class="tools-intro">Praticidade para o seu carro e suas viagens.</p><div class="tools-grid">'+
      card('postos','Postos de combustíveis','Encontre postos próximos no Google Maps.','postos')+
      card('restaurantes','Restaurantes','Encontre restaurantes próximos no Google Maps.')+
      card('etanol','Cálculo etanol x gasolina','Compare os preços antes de abastecer.','calc')+
      card('veiculos','Veículos','Confira quais estão ativos no seu plano.','veiculos')+
      card('corrida','Gerar corrida','Crie um comprovante para compartilhar.','corrida')+'</div>','config')+
      screen('postos','Postos de combustíveis',root.TMyPostos.html)+
      screen('restaurantes','Restaurantes',root.TMyPostos.restaurantes.html)+
      screen('etanol','Etanol x gasolina','<form id="toolsFuelForm" class="tools-form"><label>Etanol — preço por litro (R$)<input id="toolsEtanol" inputmode="decimal" placeholder="Ex.: 4,20" maxlength="12" required></label><label>Gasolina — preço por litro (R$)<input id="toolsGasolina" inputmode="decimal" placeholder="Ex.: 6,00" maxlength="12" required></label><button class="tools-action" type="submit">Calcular</button><p class="tools-error" id="toolsFuelError" role="alert"></p></form><div id="toolsFuelResult" class="tools-result" role="status" hidden></div>')+
      screen('veiculos','Veículos','<p id="toolsVehicleSummary" class="tools-intro"></p><div id="toolsVehicles"></div><button id="toolsChooseVehicle" type="button" class="tools-action" hidden>Escolher veículo ativo</button><button id="toolsSubscribe" type="button" class="tools-action" hidden>Ver planos Premium</button>')+
      screen('corrida','Gerar corrida','<div class="tools-grid tools-ride-menu"><button class="tools-action tools-secondary" data-tool="clientes" type="button">Clientes</button><button class="tools-action tools-secondary" data-tool="comprovantes" type="button">Comprovantes salvos</button></div><p class="tools-intro">Cada nova corrida começa com os campos limpos. Ao gerar, o comprovante é guardado no histórico para baixar ou compartilhar depois.</p><form id="toolsRideForm" class="tools-form"><label>Cliente (opcional)<select id="rideCliente"><option value="">Sem cliente selecionado</option></select></label>'+
      '<div class="tools-client-prefill"><label>Nome ou razão social do cliente (opcional)<input id="rideClienteNome" maxlength="100"></label><label>CPF/CNPJ do cliente (opcional)<input id="rideClienteDocumento" maxlength="18"></label><label>Telefone do cliente (opcional)<input id="rideClienteTelefone" type="tel" maxlength="24"></label></div><label>Local de saída<input id="rideOrigem" maxlength="180" required></label><label>Local de chegada<input id="rideDestino" maxlength="180" required></label><label>Data da corrida<input id="rideData" type="date" required></label><label>Valor da corrida (R$)<input id="rideValor" inputmode="decimal" maxlength="12" placeholder="Ex.: 85,00" required></label><label>Mensagem do comprovante<textarea id="rideMensagem" maxlength="300" required></textarea></label><button class="tools-action" type="submit">Gerar comprovante</button><p id="toolsRideError" class="tools-error" role="alert"></p></form><div id="toolsRideOutput" hidden><div id="toolsRidePreview" class="tools-preview"></div><button id="toolsSharePdf" type="button" class="tools-action tools-secondary">Compartilhar PDF</button><button id="toolsDownloadPdf" type="button" class="tools-action tools-secondary">Baixar PDF</button><p id="toolsShareStatus" class="tools-note" role="status">No compartilhamento, escolha o WhatsApp. Se não estiver disponível, baixe o PDF e anexe na conversa.</p></div>');
    $('s-config').parentElement.insertAdjacentHTML('beforeend',markup);
    $('s-config').parentElement.insertAdjacentHTML('beforeend',
      screen('clientes','Clientes','<p class="tools-intro">Preencha os dados disponíveis: nome ou razão social, telefone ou CPF/CNPJ. Nenhum campo é obrigatório individualmente. Use somente dados que você tem autorização para guardar.</p><button class="tools-action" id="toolsAddClient" type="button" aria-expanded="false" aria-controls="toolsClientForm">Adicionar cliente</button><form id="toolsClientForm" class="tools-form" hidden><label>Nome ou razão social (opcional)<input id="clientNome" maxlength="100"></label><label>Telefone (opcional)<input id="clientTelefone" type="tel" maxlength="24"></label><label>CPF/CNPJ (opcional)<input id="clientDocumento" maxlength="18"></label><button class="tools-action" type="submit">Salvar cliente</button><button id="toolsCancelClient" class="tools-action tools-secondary" type="button">Cancelar</button></form><p id="toolsClientStatus" class="tools-note" role="status"></p><h3 class="tools-list-title">Clientes salvos</h3><label class="tools-search">Buscar cliente<input id="toolsClientSearch" type="search" maxlength="120" placeholder="Nome, razão social, CPF/CNPJ ou telefone"></label><div id="toolsClients"></div>','corrida')+
      screen('comprovantes','Comprovantes salvos','<p class="tools-intro">Abra um comprovante para baixar o PDF ou compartilhar. O histórico preserva os dados da corrida original.</p><p id="toolsArchiveStatus" class="tools-note" role="status"></p><div class="tools-archive-filters"><h3>Organização</h3><label>Ano<select id="toolsArchiveYear"></select></label><label>Mês<select id="toolsArchiveMonth"></select></label></div><div id="toolsReceipts"></div>','corrida'));
    document.querySelectorAll('.tools-screen [data-back],.tools-screen [data-tool]').forEach(b=>b.addEventListener('click',()=>api.go(b.dataset.back||b.dataset.tool)));
    let editingClient=null;
    function clientForm(visible){$('toolsClientForm').hidden=!visible;$('toolsAddClient').setAttribute('aria-expanded',String(visible));}
    $('toolsAddClient').addEventListener('click',()=>{editingClient=null;$('toolsClientForm').reset();clientForm(true);});
    $('toolsCancelClient').addEventListener('click',()=>{editingClient=null;$('toolsClientForm').reset();clientForm(false);});
    document.querySelectorAll('[data-map-kind]').forEach(link=>link.addEventListener('click',event=>{
      if(root.TMyNative && root.TMyNative.openMap){
        event.preventDefault();root.TMyNative.openMap(link.dataset.mapKind).catch(e=>api.notify(e.message));
      }
    }));
    let file=null,receipt=null,lastRoute='',generation=0,busy=false;
    const id=()=>crypto.randomUUID();
    function cleanRide(){generation++;busy=false;invalidate();$('toolsRideForm').reset();$('rideMensagem').value=F.MENSAGEM;$('toolsRideError').textContent='';$('toolsRideForm').querySelector('button[type="submit"]').disabled=false;}
    function invalidate(){file=null;receipt=null;$('toolsRideOutput').hidden=true;$('toolsRidePreview').textContent='';$('toolsShareStatus').textContent='No compartilhamento, escolha o WhatsApp. Se não estiver disponível, baixe o PDF e anexe na conversa.';}
    function reset(){editingClient=null;$('toolsClientSearch').value='';$('toolsArchiveYear').replaceChildren();$('toolsArchiveMonth').replaceChildren();clientForm(false);cleanRide();lastRoute='';$('toolsClientForm').reset();$('toolsClients').replaceChildren();$('toolsReceipts').replaceChildren();$('toolsClientStatus').textContent='';$('toolsArchiveStatus').textContent='';$('rideCliente').replaceChildren(new Option('Sem cliente selecionado',''));$('toolsFuelForm').reset();$('toolsFuelResult').hidden=true;$('toolsFuelError').textContent='';$('toolsVehicles').replaceChildren();}
    $('rideMensagem').value=F.MENSAGEM;
    ['toolsEtanol','toolsGasolina','rideValor'].forEach(name=>{const input=$(name);input.maxLength=18;input.placeholder='R$ 0,00';input.inputMode='numeric';input.addEventListener('input',()=>F.mascaraMoeda(input));});
    $('toolsRideForm').autocomplete='off';
    function clientOptions(){const selected=$('rideCliente').value;$('rideCliente').replaceChildren(new Option('Sem cliente selecionado',''));(api.state().clientes||[]).forEach(c=>$('rideCliente').add(new Option([c.nome,c.documento].filter(Boolean).join(' · ')||c.telefone,c.id)));$('rideCliente').value=selected;}
    $('rideCliente').addEventListener('change',()=>{const c=(api.state().clientes||[]).find(c=>c.id===$('rideCliente').value);$('rideClienteNome').value=c?.nome||'';$('rideClienteDocumento').value=c?.documento||'';$('rideClienteTelefone').value=c?.telefone||'';invalidate();});
    const normalized=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    $('toolsClientSearch').addEventListener('input',clients);
    function clientIcon(label,path,handler){const b=action('',handler);b.className='tools-client-icon';b.setAttribute('aria-label',label);b.title=label;b.innerHTML=icon(path);return b;}
    function action(text,callback){const b=document.createElement('button');b.type='button';b.className='tools-action tools-secondary';b.textContent=text;b.addEventListener('click',callback);return b;}
    function listBox(title,detail){const box=document.createElement('div');box.className='tools-vehicle';const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=detail;box.append(h,p);return box;}
    function clients(){
      const list=$('toolsClients');list.replaceChildren();const query=normalized($('toolsClientSearch').value).trim();
      const items=(api.state().clientes||[]).filter(c=>{const text=normalized([c.nome,c.documento,c.telefone].join(' '));return query.split(/\s+/).every(q=>text.includes(q)||(/^[\d().+/-]+$/.test(q)&&/\d/.test(q)&&text.replace(/\D/g,'').includes(q.replace(/\D/g,''))));});
      if(!items.length){list.append(listBox(query?'Nenhum cliente encontrado':'Nenhum cliente cadastrado',query?'Tente outro nome ou documento.':'Toque em Adicionar cliente para cadastrar.'));return;}
      items.forEach(c=>{
        const box=document.createElement('div');box.className='tools-client-row';
        const info=listBox(c.nome||c.documento||c.telefone,[c.nome?c.documento:'',(c.nome||c.documento)?c.telefone:''].filter(Boolean).join(' · '));info.className='tools-client-info';
        const controls=document.createElement('div');controls.className='tools-client-controls';
        controls.append(clientIcon('Editar cliente','M12 20h9M16 3l5 5-12 12-5 1 1-5z',()=>{editingClient=c.id;$('clientNome').value=c.nome||'';$('clientDocumento').value=c.documento||'';$('clientTelefone').value=c.telefone||'';clientForm(true);$('toolsClientForm').scrollIntoView({block:'nearest'});}));
        controls.append(clientIcon('Apagar cliente','M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',()=>api.confirm('Excluir cliente','Os comprovantes já gerados serão preservados.',async()=>{
          const session=generation;const ok=await api.saveTools('clientes',(api.state().clientes||[]).filter(x=>x.id!==c.id));if(session!==generation)return;
          if(ok){if(editingClient===c.id){editingClient=null;clientForm(false);}clients();clientOptions();}else $('toolsClientStatus').textContent='Não foi possível salvar a exclusão. Tente novamente.';
        })));
        box.append(info,controls);list.append(box);
      });
    }
    $('toolsClientForm').addEventListener('submit',async event=>{
      event.preventDefault();const button=event.submitter||$('toolsClientForm').querySelector('button');if(button.disabled)return;
      const session=generation;button.disabled=true;
      try{const c=F.cliente({nome:$('clientNome').value,telefone:$('clientTelefone').value,documento:$('clientDocumento').value});const items=api.state().clientes||[];
        if(!editingClient&&items.length>=100)throw new Error('Limite de 100 clientes. Exclua um cadastro antigo para continuar.');
        const edit=editingClient;if(edit&&!items.some(x=>x.id===edit))throw new Error('Cliente não encontrado. Abra o cadastro novamente.');
        if(!await api.saveTools('clientes',edit?items.map(x=>x.id===edit?{...x,...c}:x):[...items,{id:id(),...c}]))throw new Error('Não foi possível salvar. Verifique o armazenamento do aparelho.');
        if(session!==generation)return;editingClient=null;$('toolsClientForm').reset();$('toolsClientStatus').textContent='Cliente salvo.';clientForm(false);clients();clientOptions();
      }catch(e){if(session===generation)$('toolsClientStatus').textContent=e.message;}finally{button.disabled=false;}
    });
    function showReceipt(d,generated){receipt=d;file=generated||makePdf(d);$('toolsRidePreview').textContent=F.mensagem(d);$('toolsRideOutput').hidden=false;const screen=$('s-corrida');screen.scrollTo({top:screen.scrollTop+$('toolsRideOutput').getBoundingClientRect().top-screen.getBoundingClientRect().top-78,behavior:'smooth'});}
    const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    $('toolsArchiveYear').addEventListener('change',archive);$('toolsArchiveMonth').addEventListener('change',archive);
    function archive(){
      const list=$('toolsReceipts');list.replaceChildren();const all=api.state().comprovantes||[];const year=$('toolsArchiveYear').value,month=$('toolsArchiveMonth').value;
      $('toolsArchiveYear').replaceChildren(new Option('Todos os anos',''));[...new Set(all.map(r=>String(r.data||'').slice(0,4)))].filter(y=>/^\d{4}$/.test(y)).sort().reverse().forEach(y=>$('toolsArchiveYear').add(new Option(y,y)));$('toolsArchiveYear').value=year;
      $('toolsArchiveMonth').replaceChildren(new Option('Todos os meses',''));months.forEach((m,i)=>$('toolsArchiveMonth').add(new Option(m,String(i+1).padStart(2,'0'))));$('toolsArchiveMonth').value=month;
      const items=all.filter(r=>(!$('toolsArchiveYear').value||r.data.slice(0,4)===$('toolsArchiveYear').value)&&(!month||r.data.slice(5,7)===month));
      if(!items.length){list.append(listBox(all.length?'Nenhum comprovante neste período':'Nenhum comprovante salvo',all.length?'Escolha outro ano ou mês.':'Os comprovantes aparecerão aqui depois de gerar uma corrida.'));return;}
      items.slice().sort((a,b)=>b.data.localeCompare(a.data)||(b.criadoEm||0)-(a.criadoEm||0)).forEach(r=>{const box=listBox(F.dataPt(r.data)+' · '+F.moeda(r.valor),(r.cliente?(r.cliente.nome||r.cliente.documento||'')+' · ':'')+r.origem+' → '+r.destino);
        box.append(action('Abrir comprovante',()=>{api.go('corrida');try{showReceipt(r);}catch(e){$('toolsRideError').textContent=e.message;}}));
        box.append(action('Excluir comprovante',()=>api.confirm('Excluir comprovante','O comprovante será removido do histórico. Arquivos já baixados não serão apagados.',async()=>{const ok=await api.saveTools('comprovantes',(api.state().comprovantes||[]).filter(x=>x.id!==r.id));if(ok)archive();else $('toolsArchiveStatus').textContent='Não foi possível salvar a exclusão. Tente novamente.';})));
        list.append(box);
      });
    }
    $('toolsFuelForm').addEventListener('submit',event=>{
      event.preventDefault();$('toolsFuelError').textContent='';$('toolsFuelResult').hidden=true;
      try{const r=F.comparar($('toolsEtanol').value,$('toolsGasolina').value);
        $('toolsFuelResult').textContent='Pela regra dos 70%, '+(r.melhor==='etanol'?'o etanol é mais vantajoso.':'a gasolina é mais vantajosa.')+'\n'+F.moeda(r.etanol)+' ÷ '+F.moeda(r.gasolina)+' = '+r.proporcao.toLocaleString('pt-BR',{maximumFractionDigits:4})+' ('+(r.proporcao*100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%).';
        $('toolsFuelResult').hidden=false;
      }catch(e){$('toolsFuelError').textContent=e.message;}
    });
    $('toolsFuelForm').addEventListener('input',()=>{$('toolsFuelResult').hidden=true;$('toolsFuelError').textContent='';});
    $('toolsRideForm').addEventListener('input',()=>{invalidate();$('toolsRideError').textContent='';});
    function makePdf(d){
      // Measure before drawing: receipt length follows the content, without clipping.
      const canvas=document.createElement('canvas');canvas.width=800;
      let c=canvas.getContext('2d'),y=68;const rows=[];
      function text(value,size=30,bold=false){
        const font=(bold?'bold ':'')+size+'px Arial';c.font=font;let line='';
        const flush=()=>{if(line){rows.push({text:line.trimEnd(),font,y});y+=size*1.4;line='';}};
        for(const word of String(value).split(/\s+/)){
          if(c.measureText(line?line+' '+word:word).width<=688){line=line?line+' '+word:word;continue;}
          flush();for(const letter of Array.from(word)){if(c.measureText(line+letter).width>688)flush();line+=letter;}
        }
        flush();
      }
      const rule=()=>{y+=16;rows.push({line:true,y});y+=38;};
      function field(label,value){text(label.toUpperCase(),24,true);text(value,30);y+=14;}
      text('TMy Car',48,true);text('COMPROVANTE DE CORRIDA',30,true);text('Transporte particular',26);rule();
      if(d.nome)field('Prestador',d.nome);if(d.cpf)field('CPF informado',d.cpf);if(d.cnpj)field('CNPJ informado',d.cnpj);
      if(d.cliente){if(d.cliente.nome)field('Cliente',d.cliente.nome);if(d.cliente.documento)field('CPF/CNPJ do cliente',d.cliente.documento);if(d.cliente.telefone)field('Telefone do cliente',d.cliente.telefone);}
      field('Saída',d.origem);field('Chegada',d.destino);field('Data',F.dataPt(d.data));
      rule();text('VALOR INFORMADO',26,true);text(F.moeda(d.valor),52,true);rule();
      text(d.mensagem,28);rule();text('Comprovante simples',24,true);
      text('Não é nota fiscal nem confirmação de pagamento.',24);
      canvas.height=Math.ceil(y+52);c=canvas.getContext('2d');
      c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);
      c.fillStyle='#18212b';c.strokeStyle='#76808a';c.lineWidth=2;c.textAlign='center';c.textBaseline='top';
      for(const row of rows){
        if(row.line){c.setLineDash([8,8]);c.beginPath();c.moveTo(56,row.y);c.lineTo(744,row.y);c.stroke();}
        else{c.font=row.font;c.fillText(row.text,400,row.y);}
      }
      const raw=atob(canvas.toDataURL('image/jpeg',0.94).split(',')[1]);
      const paperWidth=226.77; // 80 mm, with proportional height.
      return new File([F.pdfJpeg(Uint8Array.from(raw,ch=>ch.charCodeAt(0)),canvas.width,canvas.height,{width:paperWidth,height:paperWidth*canvas.height/canvas.width})],
        'corrida-'+d.data+'.pdf',{type:'application/pdf'});
    }
    $('toolsRideForm').addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;invalidate();$('toolsRideError').textContent='';
      const session=generation,button=$('toolsRideForm').querySelector('button[type="submit"]');busy=true;button.disabled=true;
      try{
        const d=F.corrida({origem:$('rideOrigem').value,destino:$('rideDestino').value,data:$('rideData').value,valor:$('rideValor').value,mensagem:$('rideMensagem').value,cliente:($('rideClienteNome').value.trim()||$('rideClienteDocumento').value.trim()||$('rideClienteTelefone').value.trim())?{telefone:$('rideClienteTelefone').value,nome:$('rideClienteNome').value,documento:$('rideClienteDocumento').value}:undefined});
        const generated=makePdf(d); // Reuse the validated PDF after saving.
        const records=api.state().comprovantes||[];if(records.length>=200)throw new Error('Limite de 200 comprovantes. Baixe e exclua comprovantes antigos para continuar.');
        if(!await api.saveTools('comprovantes',[...records,{id:id(),criadoEm:Date.now(),...d}]))throw new Error('Não foi possível salvar o comprovante. Verifique o armazenamento do aparelho.');
        if(session!==generation)return;
        $('toolsRideForm').reset();$('rideMensagem').value=F.MENSAGEM;showReceipt(d,generated);
        $('toolsRideError').textContent='Comprovante salvo. Os campos foram limpos para a próxima corrida.';
        // Only after validation, PDF creation and local persistence; re-opening
        // or sharing an existing receipt never triggers this event.
        if(api.receiptSaved){try{api.receiptSaved();}catch(_){}}
      }catch(e){if(session===generation){invalidate();$('toolsRideError').textContent=e.message||'Não foi possível gerar o PDF.';}}
      finally{if(session===generation){busy=false;button.disabled=false;}}
    });
    $('toolsSharePdf').addEventListener('click',async()=>{
      if(!file)return;
      const sent=file;
      try{
        if(!navigator.share||!navigator.canShare||!navigator.canShare({files:[sent]})){
          $('toolsShareStatus').textContent='Este navegador não compartilha arquivos diretamente. Toque em Baixar PDF e anexe o arquivo no WhatsApp.';return;
        }
        await navigator.share({files:[sent],title:'Comprovante de corrida'});
        if(file===sent)$('toolsShareStatus').textContent='Compartilhamento concluído.';
      }catch(e){if(file===sent)$('toolsShareStatus').textContent=e.name==='AbortError'?'Compartilhamento cancelado.':'Não foi possível compartilhar. Baixe o PDF e anexe na conversa.';}
    });
    $('toolsDownloadPdf').addEventListener('click',()=>{if(!file)return;const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);});
    $('toolsSubscribe').addEventListener('click',()=>api.go('planos'));
    $('toolsChooseVehicle').addEventListener('click',api.chooseVehicle);
    function vehicles(){
      const state=api.state(),list=$('toolsVehicles');list.replaceChildren();
      const pending=state.pending,choice=!pending&&state.plano==='free'&&state.veiculos.filter(v=>!v.inativo).length>1;
      $('toolsVehicleSummary').textContent=pending?'Confirmando seu plano…':choice?'Seu plano grátis permite 1 veículo. Escolha qual ficará ativo; os outros serão preservados.':state.plano==='free'?'Plano grátis: 1 veículo ativo.':'Premium: até 3 veículos ativos.';
      $('toolsChooseVehicle').hidden=!choice;
      $('toolsSubscribe').hidden=pending||state.plano!=='free'||!state.veiculos.some(v=>v.inativo);
      if(!state.veiculos.length){const p=document.createElement('p');p.className='tools-note';p.textContent='Nenhum veículo cadastrado. Adicione seu primeiro veículo na Garagem.';list.append(p);return;}
      state.veiculos.forEach((v,i)=>{
        const box=document.createElement('div');box.className='tools-vehicle';
        const heading=document.createElement('div');heading.className='tools-vehicle-heading';box.append(heading);
        const h=document.createElement('h3');h.textContent=[v.marca,v.modelo,v.ano].filter(Boolean).join(' ');heading.append(h);
        const badge=document.createElement('span');badge.className='tools-badge'+(pending||choice?' tools-pending':v.inativo?' tools-offline':'');badge.textContent=pending?'Confirmando':choice?'Escolha pendente':v.inativo?'Offline':'Ativo';heading.append(badge);
        if(v.placa){const p=document.createElement('p');p.textContent='Placa: '+v.placa;box.append(p);}
        if(v.inativo){const p=document.createElement('p');p.textContent='Seu veículo e histórico estão preservados. Assine o Premium para voltar a utilizá-lo.';box.append(p);}
        else if(!pending&&!choice){const b=document.createElement('button');b.type='button';b.className='tools-action tools-secondary';b.textContent='Abrir veículo';b.addEventListener('click',()=>api.openVehicle(i));box.append(b);}
        list.append(box);
      });
    }
    return {reset,render(t){if(t==='veiculos')vehicles();if(t!==lastRoute){if(t==='corrida'||lastRoute==='corrida')cleanRide();if(t==='clientes'){editingClient=null;clientForm(false);$('toolsClientForm').reset();$('toolsClientStatus').textContent='';}}if(t==='corrida')clientOptions();if(t==='clientes')clients();if(t==='comprovantes')archive();lastRoute=t;}};
  };
})(window);
