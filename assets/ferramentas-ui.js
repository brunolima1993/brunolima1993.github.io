(function(root){
  'use strict';
  root.TMyFerramentasUI=function(api){
    const F=root.TMyFerramentas,$=id=>document.getElementById(id);
    const icon=path=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
    const icons={postos:'M4 21V4h10v17M2 21h14M6 7h6v5H6zM14 14h3v4a2 2 0 0 0 4 0V8l-4-4M18 5v5h3',calc:'M5 3h14v18H5zM8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2',veiculos:'m3 11 2-7h14l2 7v8h-3v-3H6v3H3zM3 11h18M6 13h2m8 0h2',corrida:'M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4'};
    const screen=(id,title,body,back='ferramentas')=>'<div class="screen tools-screen" id="s-'+id+'"><div class="topbar"><div class="topbar-left"><button type="button" class="tools-back" data-back="'+back+'" aria-label="Voltar">'+icon('M15 5l-7 7 7 7')+'</button><span class="title">'+title+'</span></div></div><div class="section">'+body+'</div></div>';
    const card=(dest,title,sub,i)=>'<button type="button" class="tools-card" data-tool="'+dest+'">'+icon(icons[i])+'<span><strong>'+title+'</strong><small>'+sub+'</small></span></button>';
    const markup=screen('ferramentas','Ferramentas','<p class="tools-intro">Praticidade para o seu carro e suas viagens.</p><div class="tools-grid">'+
      card('postos','Postos de combustíveis','Encontre postos próximos no Google Maps.','postos')+
      card('etanol','Cálculo etanol x gasolina','Compare os preços antes de abastecer.','calc')+
      card('veiculos','Veículos','Confira quais estão ativos no seu plano.','veiculos')+
      card('corrida','Gerar corrida','Crie um comprovante para compartilhar.','corrida')+'</div>','config')+
      screen('postos','Postos de combustíveis',root.TMyPostos.html)+
      screen('etanol','Etanol x gasolina','<form id="toolsFuelForm" class="tools-form"><label>Etanol — preço por litro (R$)<input id="toolsEtanol" inputmode="decimal" placeholder="Ex.: 4,20" maxlength="12" required></label><label>Gasolina — preço por litro (R$)<input id="toolsGasolina" inputmode="decimal" placeholder="Ex.: 6,00" maxlength="12" required></label><button class="tools-action" type="submit">Calcular</button><p class="tools-error" id="toolsFuelError" role="alert"></p></form><div id="toolsFuelResult" class="tools-result" role="status" hidden></div><p class="tools-note">Divida o preço do litro do <b>etanol</b> pelo preço do litro da <b>gasolina</b>.<br><br>Até <b>0,70 (70%)</b>: o etanol é mais vantajoso.<br>Acima de <b>0,70 (70%)</b>: a gasolina é mais vantajosa.<br><br>Esta é uma regra aproximada. O consumo real depende do veículo e das condições de uso.</p>')+
      screen('veiculos','Veículos','<p id="toolsVehicleSummary" class="tools-intro"></p><div id="toolsVehicles"></div><button id="toolsChooseVehicle" type="button" class="tools-action" hidden>Escolher veículo ativo</button><button id="toolsSubscribe" type="button" class="tools-action" hidden>Ver planos Premium</button>')+
      screen('corrida','Gerar corrida','<p class="tools-intro">Preencha os dados e confira o comprovante antes de compartilhar. Os dados desta corrida ficam apenas nesta sessão.</p><form id="toolsRideForm" class="tools-form">'+
      '<label>Seu nome ou razão social<input id="rideNome" maxlength="120" autocomplete="name" required></label><label>CNPJ (opcional)<input id="rideCnpj" maxlength="18" placeholder="00.000.000/0000-00"></label><label>Local de saída<input id="rideOrigem" maxlength="180" required></label><label>Local de chegada<input id="rideDestino" maxlength="180" required></label><label>Data da corrida<input id="rideData" type="date" required></label><label>Valor da corrida (R$)<input id="rideValor" inputmode="decimal" maxlength="12" placeholder="Ex.: 85,00" required></label><label>Mensagem do comprovante<textarea id="rideMensagem" maxlength="300" required></textarea></label><button class="tools-action" type="submit">Gerar comprovante</button><p id="toolsRideError" class="tools-error" role="alert"></p></form><div id="toolsRideOutput" hidden><div id="toolsRidePreview" class="tools-preview"></div><button id="toolsSharePdf" type="button" class="tools-action tools-secondary">Compartilhar PDF</button><button id="toolsDownloadPdf" type="button" class="tools-action tools-secondary">Baixar PDF</button><a id="toolsWhatsApp" class="tools-action tools-secondary" target="_blank" rel="noopener noreferrer">Enviar mensagem pelo WhatsApp</a><p id="toolsShareStatus" class="tools-note" role="status">No compartilhamento, escolha o WhatsApp. Se não estiver disponível, baixe o PDF e anexe na conversa.</p></div>');
    $('s-config').parentElement.insertAdjacentHTML('beforeend',markup);
    const postos=root.TMyPostos.create(document,navigator,root.TMyMapsConfig||{});
    document.querySelectorAll('.tools-screen [data-back],.tools-screen [data-tool]').forEach(b=>b.addEventListener('click',()=>api.go(b.dataset.back||b.dataset.tool)));
    let file=null,receipt=null;
    function invalidate(){file=null;receipt=null;$('toolsRideOutput').hidden=true;$('toolsRidePreview').textContent='';$('toolsWhatsApp').removeAttribute('href');$('toolsShareStatus').textContent='No compartilhamento, escolha o WhatsApp. Se não estiver disponível, baixe o PDF e anexe na conversa.';}
    function reset(){postos.reset();invalidate();$('toolsRideForm').reset();$('rideMensagem').value=F.MENSAGEM;$('toolsRideError').textContent='';$('toolsFuelForm').reset();$('toolsFuelResult').hidden=true;$('toolsFuelError').textContent='';$('toolsVehicles').replaceChildren();}
    $('rideMensagem').value=F.MENSAGEM;
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
      function field(label,value){wrap(label.toUpperCase(),'bold 21px Arial','#506580',28);wrap(value,'28px Arial','#12233b',36);y+=20;}
      field('Prestador',d.nome);if(d.cnpj)field('CNPJ informado',d.cnpj);
      field('Local de saída',d.origem);field('Local de chegada',d.destino);
      field('Data da corrida',F.dataPt(d.data));field('Valor informado',F.moeda(d.valor));
      wrap(d.mensagem,'25px Arial','#334a65',34);
      if(y>1570) throw new Error('O texto ficou muito longo para o comprovante. Resuma os locais ou a mensagem.');
      c.fillStyle='#e4eaf1';c.fillRect(80,1620,1080,2);y=1660;
      wrap('Comprovante simples. Não é nota fiscal nem confirmação de pagamento.','21px Arial','#506580',28);
      const raw=atob(canvas.toDataURL('image/jpeg',0.92).split(',')[1]);
      return new File([F.pdfJpeg(Uint8Array.from(raw,ch=>ch.charCodeAt(0)),1240,1754)],'corrida-'+d.data+'.pdf',{type:'application/pdf'});
    }
    $('toolsRideForm').addEventListener('submit',event=>{
      event.preventDefault();invalidate();$('toolsRideError').textContent='';
      try{
        receipt=F.corrida({nome:$('rideNome').value,cnpj:$('rideCnpj').value,origem:$('rideOrigem').value,destino:$('rideDestino').value,data:$('rideData').value,valor:$('rideValor').value,mensagem:$('rideMensagem').value});
        file=makePdf(receipt);$('toolsRidePreview').textContent=F.mensagem(receipt);
        $('toolsWhatsApp').href='https://wa.me/?text='+encodeURIComponent(F.mensagem(receipt));
        $('toolsRideOutput').hidden=false;
        const screen=$('s-corrida');
        screen.scrollTo({top:screen.scrollTop+$('toolsRideOutput').getBoundingClientRect().top-screen.getBoundingClientRect().top-78,behavior:'smooth'});
      }catch(e){invalidate();$('toolsRideError').textContent=e.message||'Não foi possível gerar o PDF.';}
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
    return {reset,render(t){postos.render(t);if(t==='veiculos')vehicles();if(t==='corrida'&&!$('rideData').value){const now=new Date();$('rideData').value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');}}};
  };
})(window);
