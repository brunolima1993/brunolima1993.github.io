"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {normalizarCompraPlay, produtoValido} = require("./billing");

const AGORA = Date.parse("2026-09-30T12:00:00Z");

function resposta(productId, estado = "SUBSCRIPTION_STATE_ACTIVE", expira = "2026-10-30T12:00:00Z") {
  return {
    startTime: "2026-09-30T11:00:00Z",
    subscriptionState: estado,
    acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    latestOrderId: "GPA.1234-5678-9012-34567",
    lineItems: [{
      productId,
      expiryTime: expira,
      autoRenewingPlan: {autoRenewEnabled: true}
    }]
  };
}

test("reconhece somente os dois produtos publicados", () => {
  assert.equal(produtoValido("tmycar_premium"), true);
  assert.equal(produtoValido("tmycar_premium_anual"), true);
  assert.equal(produtoValido("premium_falso"), false);
});

test("normaliza mensal e anual sem confiar no ciclo enviado pelo cliente", () => {
  const mensal = normalizarCompraPlay(resposta("tmycar_premium"), "tmycar_premium", AGORA);
  const anual = normalizarCompraPlay(resposta("tmycar_premium_anual"), "tmycar_premium_anual", AGORA);
  assert.equal(mensal.ciclo, "mensal");
  assert.equal(anual.ciclo, "anual");
  assert.equal(mensal.ativo, true);
  assert.equal(mensal.precisaConfirmacao, true);
});

test("não concede Premium para compra vencida, pendente ou de outro produto", () => {
  const vencida = normalizarCompraPlay(
    resposta("tmycar_premium", "SUBSCRIPTION_STATE_ACTIVE", "2026-09-29T12:00:00Z"),
    "tmycar_premium",
    AGORA
  );
  const pendente = normalizarCompraPlay(
    resposta("tmycar_premium", "SUBSCRIPTION_STATE_PENDING"),
    "tmycar_premium",
    AGORA
  );
  assert.equal(vencida.ativo, false);
  assert.equal(pendente.ativo, false);
  assert.throws(
    () => normalizarCompraPlay(resposta("tmycar_premium_anual"), "tmycar_premium", AGORA),
    /produto-nao-encontrado/
  );
});
