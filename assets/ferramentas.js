(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.TMyFerramentas=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MENSAGEM='Segue o comprovante da corrida particular, com os dados do trajeto e o valor informado. Obrigado pela preferência!';
  function centavos(valor){
    const s=String(valor==null?'':valor).trim().replace(/^R\$\s*/, '');
    if(!/^(?:\d{1,7}|\d{1,3}(?:\.\d{3}){1,2})(?:,\d{1,2})?$/.test(s) && !/^\d{1,7}\.\d{1,2}$/.test(s)) return null;
    const n=s.includes(',')?s.replace(/\./g,'').replace(',','.'):(/^\d{1,3}(?:\.\d{3})+$/.test(s)?s.replace(/\./g,''):s);
    const c=Math.round(Number(n)*100);
    return Number.isSafeInteger(c)&&c>0&&c<=999999999?c:null;
  }
  const moeda=c=>(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
  function mascaraMoeda(input){
    const digits=String(input.value).replace(/\D/g,'').slice(0,9);
    input.value=digits?moeda(Number(digits)):'';
  }
  function cliente(d){
    const nome=texto(d.nome,100,'nome ou razão social',true);
    const telefone=texto(d.telefone,24,'telefone',true);
    const documento=texto(d.documento,18,'CPF/CNPJ',true);
    if(!nome&&!telefone&&!documento)throw new Error('Preencha pelo menos uma informação do cliente.');
    if(telefone&&!/^[+()\d\s-]{8,24}$/.test(telefone))throw new Error('Confira o telefone do cliente.');
    if(documento&&!/^[A-Za-z\d./-]{11,18}$/.test(documento))throw new Error('Confira o CPF/CNPJ do cliente.');
    return {nome,telefone,documento};
  }
  function comparar(etanol,gasolina){
    const e=centavos(etanol),g=centavos(gasolina);
    if(e===null||g===null) throw new Error('Informe preços válidos e maiores que zero, como 4,29.');
    return {etanol:e,gasolina:g,proporcao:e/g,melhor:e*100<=g*70?'etanol':'gasolina'};
  }
  function texto(v,max,nome,opcional=false){
    const s=String(v||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
    if((!s&&!opcional)||s.length>max) throw new Error('Confira o campo '+nome+'.');
    return s;
  }
  function corrida(d){
    const nome=texto(d.nome,120,'nome',true),origem=texto(d.origem,180,'local de saída'),destino=texto(d.destino,180,'local de chegada');
    const cnpj=texto(d.cnpj,18,'CNPJ',true);
    const cpf=texto(d.cpf,14,'CPF',true);
    if(cpf && !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(cpf))throw new Error('Confira o CPF informado.');
    if(cnpj && !/^[A-Za-z\d./-]+$/.test(cnpj)) throw new Error('Confira o CNPJ informado.');
    const data=String(d.data||'');
    const dt=new Date(data+'T12:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==data) throw new Error('Informe uma data válida.');
    const valor=centavos(d.valor);
    if(valor===null) throw new Error('Informe um valor válido e maior que zero.');
    return {nome,cnpj,...(cpf?{cpf}:{}),origem,destino,data,valor,mensagem:texto(d.mensagem,300,'mensagem'),...(d.cliente?{cliente:cliente(d.cliente)}:{})};
  }
  const dataPt=d=>d.split('-').reverse().join('/');
  function mensagem(d){
    return [d.mensagem,'','COMPROVANTE DE CORRIDA PARTICULAR',d.nome?'Prestador: '+d.nome:'',d.cpf?'CPF: '+d.cpf:'',d.cnpj?'CNPJ: '+d.cnpj:'',d.cliente&&d.cliente.nome?'Cliente: '+d.cliente.nome:'',d.cliente&&d.cliente.documento?'CPF/CNPJ do cliente: '+d.cliente.documento:'',
      'Saída: '+d.origem,'Chegada: '+d.destino,'Data: '+dataPt(d.data),'Valor informado: '+moeda(d.valor),'',
      'Comprovante simples. Não é nota fiscal nem confirmação de pagamento.'].filter(x=>x!==null).join('\n');
  }
  // A small single-page PDF container for a locally rendered JPEG. No uploads or remote services.
  function pdfJpeg(jpeg,width,height,paper={width:595.28,height:841.89}){
    if(!Number.isFinite(paper.width)||!Number.isFinite(paper.height)||paper.width<=0||paper.height<=0||paper.width>14400||paper.height>14400)throw new Error('Tamanho de PDF inválido.');
    const pageW=paper.width.toFixed(2),pageH=paper.height.toFixed(2);
    const encoder=new TextEncoder(),parts=[],offsets=[0];let size=0;
    const add=p=>{const b=typeof p==='string'?encoder.encode(p):p;parts.push(b);size+=b.length;};
    const obj=(n,s)=>{offsets[n]=size;add(n+' 0 obj\n'+s+'\nendobj\n');};
    add('%PDF-1.4\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageW+' '+pageH+'] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=size;add('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');
    add(jpeg);add('\nendstream\nendobj\n');
    const stream='q\n'+pageW+' 0 0 '+pageH+' 0 0 cm\n/Im0 Do\nQ\n';
    obj(5,'<< /Length '+encoder.encode(stream).length+' >>\nstream\n'+stream+'endstream');
    const start=size;add('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)add(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF');
    const out=new Uint8Array(size);let pos=0;for(const b of parts){out.set(b,pos);pos+=b.length;}return out;
  }
  return {MENSAGEM,centavos,moeda,mascaraMoeda,cliente,comparar,corrida,mensagem,dataPt,pdfJpeg};
});
