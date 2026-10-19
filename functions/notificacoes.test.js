"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  somarMesesISO,
  diferencaDiasISO,
  faseDoLembrete,
  montarNotificacao,
  lembretesDoPerfil
} = require("./notificacoes");

test("elétricos notificam os seis itens sem assumir intervalos nem alertar painéis arquivados", () => {
  const itens = ["cabine", "freio", "arref_bateria", "redutor", "bateria_tracao", "pneus"]
    .map(id => ({id, nome: id, revisao: true, imes: null, ultData: "2026-04-07"}));
  const perfil = {ONBOARD: true, NOTIF: {nGeral: true, nData: true}, VEIC: [{
    propulsao: "eletrico", marca: "BYD", modelo: "Dolphin", itens,
    paineisArquivados: {combustao: [{id: "oleo", imes: 6, ultData: "2026-04-07"}]}
  }]};
  assert.deepEqual(lembretesDoPerfil("uid", perfil, "2026-10-08"), []);
  itens.forEach(i => {i.imes = 6;});
  const lembretes = lembretesDoPerfil("uid", perfil, "2026-10-08");
  assert.equal(lembretes.length, 6);
  assert.ok(lembretes.every(l => l.itemId !== "oleo" && l.texto.includes("Registre a revisão")));
});

test("soma meses preservando o último dia possível", () => {
  assert.equal(somarMesesISO("2026-01-31", 1), "2026-02-28");
  assert.equal(somarMesesISO("2024-01-31", 1), "2024-02-29");
  assert.equal(somarMesesISO("2026-10-15", 6), "2027-04-15");
});

test("calcula dias e fases sem depender do fuso do servidor", () => {
  assert.equal(diferencaDiasISO("2026-10-09", "2026-09-24"), 15);
  assert.equal(faseDoLembrete(15), "15-dias");
  assert.equal(faseDoLembrete(3), "3-dias");
  assert.equal(faseDoLembrete(0), "vence-hoje");
  assert.equal(faseDoLembrete(-8), "vencido-semana-2");
  assert.equal(faseDoLembrete(16), null);
});

test("gera lembretes para todos os itens por data do painel", () => {
  const perfil = {
    ONBOARD: true,
    NOTIF: {nGeral: true, nData: true, nKm: true},
    VEIC: [{
      marca: "Fiat",
      modelo: "Uno",
      itens: [
        {id: "oleo", nome: "Óleo do Motor", imes: 6, ultData: "2026-03-24"},
        {id: "correia", nome: "Correia Dentada", imes: 48, ultData: "2022-09-24"},
        {id: "freio", nome: "Fluido de Freio", imes: 24, ultData: "2024-09-24"},
        {id: "arref", nome: "Líquido de Arrefecimento", imes: 24, ultData: "2024-09-24"},
        {id: "cambio", nome: "Óleo do Câmbio", imes: 48, ultData: "2022-09-24"},
        {id: "filtros", nome: "Filtros", imes: 12, partes: [
          {id: "oleo", nome: "Óleo", imes: 6, ultData: "2026-03-24"},
          {id: "ar", nome: "Ar do motor", imes: 12, ultData: "2025-09-24"},
          {id: "comb", nome: "Combustível", imes: 12, ultData: "2025-09-24"},
          {id: "cab", nome: "Cabine", imes: 12, ultData: "2025-09-24"}
        ]}
      ]
    }]
  };
  const lembretes = lembretesDoPerfil("uid-1", perfil, "2026-09-24");
  assert.equal(lembretes.length, 9);
  assert.deepEqual(lembretes.map(item => item.itemId).sort(),
    ["arref", "cambio", "correia", "filtros", "filtros", "filtros", "filtros", "freio", "oleo"]);
  assert.deepEqual(lembretes.filter(item => item.itemId === "filtros")
    .map(item => item.parteId).sort(), ["ar", "cab", "comb", "oleo"]);
  assert.ok(lembretes.every(item => item.fase === "vence-hoje"));
  assert.ok(lembretes[0].url.startsWith("https://www.tmycar.com.br/?abrir=avisos"));
});

test("respeita preferências, veículos guardados e histórico ausente", () => {
  const base = {
    ONBOARD: true,
    NOTIF: {nGeral: true, nData: true, nKm: true},
    VEIC: [{inativo: true, itens: [{id: "oleo", imes: 6, ultData: "2026-03-24"}]}]
  };
  assert.deepEqual(lembretesDoPerfil("uid", base, "2026-09-24"), []);
  base.VEIC[0].inativo = false;
  base.NOTIF.nData = false;
  assert.deepEqual(lembretesDoPerfil("uid", base, "2026-09-24"), []);
  base.NOTIF.nData = true;
  delete base.VEIC[0].itens[0].ultData;
  assert.deepEqual(lembretesDoPerfil("uid", base, "2026-09-24"), []);
});

test("vencido avisa por semana no 1º mês, depois por mês, e para após 6 meses", () => {
  assert.equal(faseDoLembrete(-1), "vencido-semana-1");
  assert.equal(faseDoLembrete(-28), "vencido-semana-4");
  assert.equal(faseDoLembrete(-29), "vencido-mes-2");
  assert.equal(faseDoLembrete(-58), "vencido-mes-2");
  assert.equal(faseDoLembrete(-59), "vencido-mes-3");
  assert.equal(faseDoLembrete(-178), "vencido-mes-6");
  assert.equal(faseDoLembrete(-179), null);
});

test("vários lembretes do dia viram uma notificação só", () => {
  const base = {titulo: "t", texto: "x", url: "u"};
  const lista = [
    {...base, itemId: "oleo", vencimento: "2026-11-02", resumo: "Óleo (Fiat Argo): vence em 15 dias"},
    {...base, itemId: "freio", vencimento: "2026-10-10", resumo: "Freio (Fiat Argo): vencido há 8 dias"},
    {...base, itemId: "a", vencimento: "2026-11-01", resumo: "A"},
    {...base, itemId: "b", vencimento: "2026-11-01", resumo: "B"},
    {...base, itemId: "c", vencimento: "2026-11-01", resumo: "C"}
  ];
  const n = montarNotificacao(lista, "2026-10-18");
  assert.equal(n.titulo, "TMy Car · 5 manutenções pedem atenção");
  assert.ok(n.texto.startsWith("• Freio"));
  assert.ok(n.texto.endsWith("e mais 1 item."));
  assert.equal(n.url, "https://www.tmycar.com.br/?abrir=avisos");
  const um = montarNotificacao([lista[0]], "2026-10-18");
  assert.equal(um.texto, "x");
  assert.equal(montarNotificacao([], "2026-10-18"), null);
});
