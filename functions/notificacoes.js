"use strict";

const FUSO_BRASILIA = "America/Sao_Paulo";
const DIA_MS = 24 * 60 * 60 * 1000;
/* Todos os itens por data exibidos no painel de manutenção. Os quatro filtros
   continuam independentes porque cada parte guarda seu próprio intervalo. */
const ITENS_PRIORITARIOS = new Set([
  "oleo",
  "correia",
  "filtros",
  "freio",
  "arref",
  "cambio",
  "cabine",
  "arref_bateria",
  "redutor",
  "bateria_tracao",
  "pneus"
]);

function limitarTexto(valor, limite) {
  return String(valor || "").trim().slice(0, limite);
}

function partesData(dataISO) {
  const achou = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dataISO || ""));
  if (!achou) return null;
  const ano = Number(achou[1]);
  const mes = Number(achou[2]);
  const dia = Number(achou[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 ||
      data.getUTCDate() !== dia) return null;
  return {ano, mes, dia, ms: data.getTime()};
}

function dataISO(ano, mes, dia) {
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/* Mantém o mesmo comportamento do app: 31/01 + 1 mês termina em 28/02
   (ou 29/02), em vez de pular para março. */
function somarMesesISO(origemISO, quantidade) {
  const origem = partesData(origemISO);
  const meses = Number(quantidade);
  if (!origem || !Number.isInteger(meses) || meses <= 0 || meses > 600) return null;
  const inicioDestino = new Date(Date.UTC(origem.ano, origem.mes - 1 + meses, 1));
  const ano = inicioDestino.getUTCFullYear();
  const mes = inicioDestino.getUTCMonth() + 1;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  return dataISO(ano, mes, Math.min(origem.dia, ultimoDia));
}

function diferencaDiasISO(alvoISO, hojeISO) {
  const alvo = partesData(alvoISO);
  const hoje = partesData(hojeISO);
  if (!alvo || !hoje) return null;
  return Math.round((alvo.ms - hoje.ms) / DIA_MS);
}

function hojeEmBrasilia(agora = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(agora).reduce((acc, parte) => {
    if (parte.type !== "literal") acc[parte.type] = parte.value;
    return acc;
  }, {});
  return `${partes.year}-${partes.month}-${partes.day}`;
}

function faseDoLembrete(dias) {
  if (!Number.isInteger(dias) || dias > 15) return null;
  if (dias > 3) return "15-dias";
  if (dias > 0) return "3-dias";
  if (dias === 0) return "vence-hoje";
  return `vencido-semana-${Math.floor((Math.abs(dias) - 1) / 7) + 1}`;
}

function nomeVeiculo(veiculo) {
  return limitarTexto([veiculo && veiculo.marca, veiculo && veiculo.modelo]
    .filter(Boolean).join(" "), 48) || "Seu veículo";
}

function intervaloMeses(item, parte) {
  const valor = parte && Object.prototype.hasOwnProperty.call(parte, "imes")
    ? parte.imes : item.imes;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 && numero <= 600 ? numero : null;
}

function alvosDoItem(item) {
  if (Array.isArray(item.partes) && item.partes.length) {
    return item.partes.map(parte => ({
      parte,
      parteId: limitarTexto(parte.id, 30),
      rotulo: `${item.nome || "Filtros"} · ${parte.nome || "Item"}`,
      ultimaData: parte.ultData
    }));
  }
  return [{
    parte: null,
    parteId: "",
    rotulo: item.nome || "Manutenção",
    ultimaData: item.ultData
  }];
}

function textoDoLembrete(rotulo, veiculo, vencimentoISO, dias, revisao = false) {
  const [ano, mes, dia] = vencimentoISO.split("-");
  const vencimentoBR = `${dia}/${mes}/${ano}`;
  if (dias > 1) return `${rotulo} do ${veiculo} vence em ${dias} dias, em ${vencimentoBR}.`;
  if (dias === 1) return `${rotulo} do ${veiculo} vence amanhã.`;
  if (dias === 0) return `${rotulo} do ${veiculo} vence hoje.`;
  const atraso = Math.abs(dias);
  return `${rotulo} do ${veiculo} venceu há ${atraso} ${atraso === 1 ? "dia" : "dias"}. Registre a ${revisao ? "revisão" : "troca"} quando fizer a manutenção.`;
}

function lembretesDoPerfil(uid, perfil, hojeISO = hojeEmBrasilia()) {
  const notificacoes = perfil && perfil.NOTIF;
  if (!perfil || perfil.ONBOARD !== true || !notificacoes ||
      notificacoes.nGeral !== true || notificacoes.nData !== true ||
      !Array.isArray(perfil.VEIC)) return [];

  const lembretes = [];
  perfil.VEIC.forEach((veiculo, indiceVeiculo) => {
    if (!veiculo || veiculo.inativo || !Array.isArray(veiculo.itens)) return;
    const nome = nomeVeiculo(veiculo);
    veiculo.itens.forEach(item => {
      if (!item || !ITENS_PRIORITARIOS.has(item.id)) return;
      alvosDoItem(item).forEach(alvo => {
        const meses = intervaloMeses(item, alvo.parte);
        const vencimento = meses && somarMesesISO(alvo.ultimaData, meses);
        const dias = vencimento && diferencaDiasISO(vencimento, hojeISO);
        const fase = faseDoLembrete(dias);
        if (!vencimento || fase === null) return;

        const rotulo = limitarTexto(alvo.rotulo, 56);
        const itemId = limitarTexto(item.id, 30);
        const chave = [uid, indiceVeiculo, itemId, alvo.parteId || "item", vencimento, fase].join("|");
        const parametros = new URLSearchParams({
          abrir: "avisos",
          veic: String(indiceVeiculo),
          item: itemId
        });
        if (alvo.parteId) parametros.set("parte", alvo.parteId);
        lembretes.push({
          chave,
          uid,
          indiceVeiculo,
          itemId,
          parteId: alvo.parteId,
          vencimento,
          fase,
          titulo: limitarTexto(`${rotulo} · ${nome}`, 90),
          texto: limitarTexto(textoDoLembrete(rotulo, nome, vencimento, dias, item.revisao === true), 220),
          url: `https://tmycar.com.br/?${parametros.toString()}`
        });
      });
    });
  });
  return lembretes.concat(lembretesGastos(uid, perfil, hojeISO));
}

function lembretesGastos(uid, perfil, hojeISO) {
  if(!perfil || perfil.ONBOARD!==true || !perfil.NOTIF || perfil.NOTIF.nGeral!==true || perfil.NOTIF.nData!==true || !Array.isArray(perfil.VEIC))return [];
  const nomes={ipva:'IPVA',multas:'Multa',seguro:'Seguro'};
  return (Array.isArray(perfil.REGISTROS)?perfil.REGISTROS:[]).flatMap(r=>{
    if(!r||!nomes[r.tipo]||r.pago!==false||r.lembrete!==true||typeof r.id!=='string'||!r.id||r.id.length>64||!Number.isInteger(r.veic))return [];
    const v=perfil.VEIC[r.veic];if(!v||v.inativo)return [];
    const dias=diferencaDiasISO(r.vencimento,hojeISO);if(dias!==7&&dias!==0)return [];
    const fase=dias===7?'7-dias':'vence-hoje';
    return [{chave:[uid,'gasto',r.id,r.vencimento,fase].join('|'),tag:['tmycar-gasto',r.id,r.vencimento,fase].join('|'),uid,indiceVeiculo:r.veic,itemId:'gasto-'+r.tipo,parteId:'',vencimento:r.vencimento,fase,
      titulo:limitarTexto(`${nomes[r.tipo]} · ${nomeVeiculo(v)}`,90),
      texto:`${nomes[r.tipo]} ${dias===7?'vence em 7 dias':'vence hoje'}. Confira em Gastos e marque como pago após quitar.`,
      url:'https://www.tmycar.com.br/?abrir=gastos'}];
  });
}

module.exports = {
  FUSO_BRASILIA,
  somarMesesISO,
  diferencaDiasISO,
  hojeEmBrasilia,
  faseDoLembrete,
  lembretesGastos,
  lembretesDoPerfil
};
