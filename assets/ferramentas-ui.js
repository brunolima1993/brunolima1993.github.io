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
      screen('etanol','Etanol x gasolina','<form id="toolsFuelForm" class="tools-form"><label>Etanol — preço por litro (R$)<input id="toolsEtanol" inputmode="decimal" placeholder="Ex.: 4,20" maxlength="12" required></label><label>Gasolina — preço por litro (R$)<input id="toolsGasolina" inputmode="decimal" placeholder="Ex.: 6,00" maxlength="12" required></label><button class="tools-action" type="submit">Calcular</button><p class="tools-error" id="toolsFuelError" role="alert"></p></form><div id="toolsFuelResult" class="tools-result" role="status" hidden></div><p class="tools-note">Divida o preço do litro do <b>etanol</b> pelo preço do litro da <b>gasolina</b>.<br><br>Até <b>0,70 (70%)</b>: o etanol é mais vantajoso.<br>Acima de <b>0,70 (70%)</b>: a gasolina é mais vantajosa.<br><br>Esta é uma regra aproximada. O consumo real depende do veículo e das condições de uso.</p>')+
      screen('veiculos','Veículos','<p id="toolsVehicleSummary" class="tools-intro"></p><div id="toolsVehicles"></div><button id="toolsChooseVehicle" type="button" class="tools-action" hidden>Escolher veículo ativo</button><button id="toolsSubscribe" type="button" class="tools-action" hidden>Ver planos Premium</button>')+
      screen('corrida','Gerar corrida','<div class="tools-grid tools-ride-menu"><button class="tools-action tools-secondary" data-tool="clientes" type="button">Adicionar cliente</button><button class="tools-action tools-secondary" data-tool="comprovantes" type="button">Comprovantes salvos</button></div><p class="tools-intro">Cada nova corrida começa com os campos limpos. Ao gerar, o comprovante é guardado no histórico para baixar ou compartilhar depois.</p><form id="toolsRideForm" class="tools-form"><label>Cliente (opcional)<select id="rideCliente"><option value="">Sem cliente selecionado</option></select></label>'+
      '<label>Seu nome ou razão social<input id="rideNome" maxlength="120" autocomplete="name" required></label><label>CNPJ (opcional)<input id="rideCnpj" maxlength="18" placeholder="00.000.000/0000-00"></label><label>Local de saída<input id="rideOrigem" maxlength="180" required></label><label>Local de chegada<input id="rideDestino" maxlength="180" required></label><label>Data da corrida<input id="rideData" type="date" required></label><label>Valor da corrida (R$)<input id="rideValor" inputmode="decimal" maxlength="12" placeholder="Ex.: 85,00" required></label><label>Mensagem do comprovante<textarea id="rideMensagem" maxlength="300" required></textarea></label><button class="tools-action" type="submit">Gerar comprovante</button><p id="toolsRideError" class="tools-error" role="alert"></p></form><div id="toolsRideOutput" hidden><div id="toolsRidePreview" class="tools-preview"></div><button id="toolsSharePdf" type="button" class="tools-action tools-secondary">Compartilhar PDF</button><button id="toolsDownloadPdf" type="button" class="tools-action tools-secondary">Baixar PDF</button><a id="toolsWhatsApp" class="tools-action tools-secondary" target="_blank" rel="noopener noreferrer">Enviar mensagem pelo WhatsApp</a><p id="toolsShareStatus" class="tools-note" role="status">No compartilhamento, escolha o WhatsApp. Se não estiver disponível, baixe o PDF e anexe na conversa.</p></div>');
    $('s-config').parentElement.insertAdjacentHTML('beforeend',markup);
    $('s-config').parentElement.insertAdjacentHTML('beforeend',
      screen('clientes','Clientes','<p class="tools-intro">Cadastre o nome e, se quiser, telefone e CPF/CNPJ. Use somente dados que você tem autorização para guardar.</p><form id="toolsClientForm" class="tools-form"><label>Nome do cliente<input id="clientNome" maxlength="100" required></label><label>Telefone (opcional)<input id="clientTelefone" type="tel" maxlength="24"></label><label>CPF/CNPJ (opcional)<input id="clientDocumento" maxlength="18"></label><button class="tools-action" type="submit">Salvar cliente</button><p id="toolsClientStatus" class="tools-note" role="status"></p></form><div id="toolsClients"></div>','corrida')+
      screen('comprovantes','Comprovantes salvos','<p class="tools-intro">Abra um comprovante para baixar o PDF ou compartilhar. O histórico preserva os dados da corrida original.</p><p id="toolsArchiveStatus" class="tools-note" role="status"></p><div id="toolsReceipts"></div>','corrida'));
    document.querySelectorAll('.tools-screen [data-back],.tools-screen [data-tool]').forEach(b=>b.addEventListener('click',()=>api.go(b.dataset.back||b.dataset.tool)));
    let file=null,receipt=null,lastRoute='',generation=0,busy=false;
    const id=()=>crypto.randomUUID();
    function cleanRide(){generation++;busy=false;invalidate();$('toolsRideForm').reset();$('rideMensagem').value=F.MENSAGEM;$('toolsRideError').textContent='';$('toolsRideForm').querySelector('button[type="submit"]').disabled=false;}
    function invalidate(){file=null;receipt=null;$('toolsRideOutput').hidden=true;$('toolsRidePreview').textContent='';$('toolsWhatsApp').removeAttribute('href');$('toolsShareStatus').textContent='No compartilhamento, escolha o WhatsApp. Se não estiver disponível, baixe o PDF e anexe na conversa.';}
    function reset(){cleanRide();lastRoute='';$('toolsClientForm').reset();$('toolsClients').replaceChildren();$('toolsReceipts').replaceChildren();$('toolsClientStatus').textContent='';$('toolsArchiveStatus').textContent='';$('rideCliente').replaceChildren(new Option('Sem cliente selecionado',''));$('toolsFuelForm').reset();$('toolsFuelResult').hidden=true;$('toolsFuelError').textContent='';$('toolsVehicles').replaceChildren();}
    $('rideMensagem').value=F.MENSAGEM;
    ['toolsEtanol','toolsGasolina','rideValor'].forEach(name=>{const input=$(name);input.maxLength=18;input.placeholder='R$ 0,00';input.inputMode='numeric';input.addEventListener('input',()=>F.mascaraMoeda(input));});
    $('toolsRideForm').autocomplete='off';
    $('rideNome').autocomplete='off';
    function clientOptions(){const selected=$('rideCliente').value;$('rideCliente').replaceChildren(new Option('Sem cliente selecionado',''));(api.state().clientes||[]).forEach(c=>$('rideCliente').add(new Option(c.nome,c.id)));$('rideCliente').value=selected;}
    function action(text,callback){const b=document.createElement('button');b.type='button';b.className='tools-action tools-secondary';b.textContent=text;b.addEventListener('click',callback);return b;}
    function listBox(title,detail){const box=document.createElement('div');box.className='tools-vehicle';const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=detail;box.append(h,p);return box;}
    function clients(){
      const list=$('toolsClients');list.replaceChildren();const items=api.state().clientes||[];
      if(!items.length){list.append(listBox('Nenhum cliente cadastrado','Preencha os campos acima para adicionar.'));return;}
      items.forEach(c=>{const box=listBox(c.nome,[c.telefone,c.documento].filter(Boolean).join(' · '));box.append(action('Excluir cliente',()=>api.confirm('Excluir cliente','Os comprovantes já gerados serão preservados.',async()=>{
        const ok=await api.saveTools('clientes',(api.state().clientes||[]).filter(x=>x.id!==c.id));if(ok){clients();clientOptions();}else $('toolsClientStatus').textContent='Não foi possível salvar a exclusão. Tente novamente.';
      })));list.append(box);});
    }
    $('toolsClientForm').addEventListener('submit',async event=>{
      event.preventDefault();const button=event.submitter||$('toolsClientForm').querySelector('button');if(button.disabled)return;
      const session=generation;button.disabled=true;
      try{const c=F.cliente({nome:$('clientNome').value,telefone:$('clientTelefone').value,documento:$('clientDocumento').value});const items=api.state().clientes||[];
        if(items.length>=100)throw new Error('Limite de 100 clientes. Exclua um cadastro antigo para continuar.');
        if(!await api.saveTools('clientes',[...items,{id:id(),...c}]))throw new Error('Não foi possível salvar. Verifique o armazenamento do aparelho.');
        if(session!==generation)return;$('toolsClientForm').reset();$('toolsClientStatus').textContent='Cliente salvo.';clients();clientOptions();
      }catch(e){if(session===generation)$('toolsClientStatus').textContent=e.message;}finally{button.disabled=false;}
    });
    function showReceipt(d){receipt=d;file=makePdf(d);$('toolsRidePreview').textContent=F.mensagem(d);$('toolsWhatsApp').href='https://wa.me/?text='+encodeURIComponent(F.mensagem(d));$('toolsRideOutput').hidden=false;const screen=$('s-corrida');screen.scrollTo({top:screen.scrollTop+$('toolsRideOutput').getBoundingClientRect().top-screen.getBoundingClientRect().top-78,behavior:'smooth'});}
    function archive(){
      const list=$('toolsReceipts');list.replaceChildren();const items=api.state().comprovantes||[];
      if(!items.length){list.append(listBox('Nenhum comprovante salvo','Os comprovantes aparecerão aqui depois de gerar uma corrida.'));return;}
      items.slice().reverse().forEach(r=>{const box=listBox(F.dataPt(r.data)+' · '+F.moeda(r.valor),(r.cliente?r.cliente.nome+' · ':'')+r.origem+' → '+r.destino);
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
      const canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;
      const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1240,1754);
      c.fillStyle='#061a35';c.fillRect(0,0,1240,230);c.fillStyle='#4ab9ff';c.font='bold 42px Arial';c.fillText('TMy Car',80,85);
      c.fillStyle='#fff';c.font='bold 36px Arial';c.fillText('COMPROVANTE DE CORRIDA',80,153);c.font='24px Arial';c.fillText('Transporte particular',80,195);
      let y=300;
      function wrap(text,font,color,lineHeight){
        c.font=font;c.fillStyle=color;let line='';
        const flush=()=>{if(line){c.fillText(line.trimEnd(),80,y);y+=lineHeight;line='';}};
        for(const word of text.split(/\s+/)){
          const candidate=line?line+' '+word:word;
          if(c.measureText(candidate).width<=1080){line=candidate;continue;}
          flush();
          for(const ch of Array.from(word)){if(c.measureText(line+ch).width>1080)flush();line+=ch;}
        }
        flush();
      }
      function field(label,value){wrap(label.toUpperCase(),'bold 21px Arial','#506580',25);wrap(value,'26px Arial','#12233b',32);y+=14;}
      field('Prestador',d.nome);if(d.cnpj)field('CNPJ informado',d.cnpj);
      if(d.cliente){field('Cliente',d.cliente.nome);if(d.cliente.documento)field('CPF/CNPJ do cliente',d.cliente.documento);}
      field('Local de saída',d.origem);field('Local de chegada',d.destino);
      field('Data da corrida',F.dataPt(d.data));field('Valor informado',F.moeda(d.valor));
      wrap(d.mensagem,'25px Arial','#334a65',34);
      if(y>1570) throw new Error('O texto ficou muito longo para o comprovante. Resuma os locais ou a mensagem.');
      c.fillStyle='#e4eaf1';c.fillRect(80,1620,1080,2);y=1660;
      wrap('Comprovante simples. Não é nota fiscal nem confirmação de pagamento.','21px Arial','#506580',28);
      const raw=atob(canvas.toDataURL('image/jpeg',0.92).split(',')[1]);
      return new File([F.pdfJpeg(Uint8Array.from(raw,ch=>ch.charCodeAt(0)),1240,1754)],'corrida-'+d.data+'.pdf',{type:'application/pdf'});
    }
    $('toolsRideForm').addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;invalidate();$('toolsRideError').textContent='';
      const session=generation,button=$('toolsRideForm').querySelector('button[type="submit"]');busy=true;button.disabled=true;
      try{
        const d=F.corrida({nome:$('rideNome').value,cnpj:$('rideCnpj').value,origem:$('rideOrigem').value,destino:$('rideDestino').value,data:$('rideData').value,valor:$('rideValor').value,mensagem:$('rideMensagem').value,cliente:(api.state().clientes||[]).find(c=>c.id===$('rideCliente').value)});
        makePdf(d); // Validate layout before saving the snapshot.
        const records=api.state().comprovantes||[];if(records.length>=200)throw new Error('Limite de 200 comprovantes. Baixe e exclua comprovantes antigos para continuar.');
        if(!await api.saveTools('comprovantes',[...records,{id:id(),criadoEm:Date.now(),...d}]))throw new Error('Não foi possível salvar o comprovante. Verifique o armazenamento do aparelho.');
        if(session!==generation)return;
        $('toolsRideForm').reset();$('rideMensagem').value=F.MENSAGEM;showReceipt(d);
        $('toolsRideError').textContent='Comprovante salvo. Os campos foram limpos para a próxima corrida.';
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
    return {reset,render(t){if(t==='veiculos')vehicles();if(t!==lastRoute){if(t==='corrida'||lastRoute==='corrida')cleanRide();if(t==='clientes'){$('toolsClientForm').reset();$('toolsClientStatus').textContent='';}}if(t==='corrida')clientOptions();if(t==='clientes')clients();if(t==='comprovantes')archive();lastRoute=t;}};
  };
})(window);
