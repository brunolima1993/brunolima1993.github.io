"use strict";

const PRODUTOS_PLAY = Object.freeze({
  tmycar_premium: "mensal",
  tmycar_premium_anual: "anual"
});

const ESTADOS_COM_ACESSO = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
]);

function produtoValido(productId) {
  return Object.prototype.hasOwnProperty.call(PRODUTOS_PLAY, productId);
}

function normalizarCompraPlay(compra, productId, agora = Date.now()) {
  if (!produtoValido(productId)) throw new Error("produto-invalido");
  if (!compra || typeof compra !== "object") throw new Error("resposta-invalida");

  const itens = Array.isArray(compra.lineItems) ? compra.lineItems : [];
  const item = itens
    .filter(linha => linha && linha.productId === productId)
    .map(linha => ({
      linha,
      expiraEmMs: Date.parse(String(linha.expiryTime || ""))
    }))
    .filter(resultado => Number.isFinite(resultado.expiraEmMs))
    .sort((a, b) => b.expiraEmMs - a.expiraEmMs)[0];

  if (!item) throw new Error("produto-nao-encontrado");

  const estadoGoogle = String(compra.subscriptionState || "");
  const acessoPeloEstado = ESTADOS_COM_ACESSO.has(estadoGoogle);
  const ativo = acessoPeloEstado && item.expiraEmMs > agora;

  return {
    productId,
    ciclo: PRODUTOS_PLAY[productId],
    estadoGoogle,
    ativo,
    inicioEmMs: Date.parse(String(compra.startTime || "")) || null,
    expiraEmMs: item.expiraEmMs,
    renovacaoAutomatica: !!(item.linha.autoRenewingPlan &&
      item.linha.autoRenewingPlan.autoRenewEnabled),
    precisaConfirmacao: compra.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING",
    pedido: String(compra.latestOrderId || "").slice(0, 128) || null,
    tokenVinculado: String(compra.linkedPurchaseToken || "").trim() || null
  };
}

module.exports = {
  ESTADOS_COM_ACESSO,
  PRODUTOS_PLAY,
  normalizarCompraPlay,
  produtoValido
};
