"use strict";

const crypto = require("node:crypto");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");

initializeApp();

const REGIAO = "southamerica-east1";
const QUATORZE_DIAS_MS = 14 * 24 * 60 * 60 * 1000;

function identificadorBeneficio(email) {
  return crypto
    .createHash("sha256")
    .update(String(email || "").trim().toLowerCase(), "utf8")
    .digest("hex");
}

exports.ativarTesteGratis = onCall(
  {
    region: REGIAO,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    timeoutSeconds: 15,
    memory: "256MiB",
    maxInstances: 10
  },
  async request => {
    if (request.app && request.app.alreadyConsumed)
      throw new HttpsError("failed-precondition", "Solicitação já utilizada.");
    const auth = request.auth;
    if (!auth) throw new HttpsError("unauthenticated", "Entre na conta para continuar.");
    if (auth.token.email_verified !== true)
      throw new HttpsError("permission-denied", "Confirme seu e-mail para continuar.");

    const email = String(auth.token.email || "").trim().toLowerCase();
    if (!email) throw new HttpsError("failed-precondition", "A conta não possui e-mail confirmado.");

    const banco = getFirestore();
    const assinaturaRef = banco.collection("assinaturas").doc(auth.uid);
    /* O hash não revela o e-mail e impede repetir o benefício recriando a
       conta com o mesmo endereço. O documento não é legível pelo cliente. */
    const beneficioRef = banco.collection("beneficiosTeste").doc(identificadorBeneficio(email));
    const agora = Date.now();
    const fim = Timestamp.fromMillis(agora + QUATORZE_DIAS_MS);

    await banco.runTransaction(async transacao => {
      const [assinatura, beneficio] = await Promise.all([
        transacao.get(assinaturaRef),
        transacao.get(beneficioRef)
      ]);
      const atual = assinatura.exists ? assinatura.data() : null;
      if (beneficio.exists || (atual && atual.testeUsado === true))
        throw new HttpsError("already-exists", "O teste grátis já foi utilizado.");
      if (atual && atual.plano === "premium" && atual.status === "ativo")
        throw new HttpsError("failed-precondition", "A conta já possui Premium ativo.");

      transacao.set(beneficioRef, {
        uid: auth.uid,
        criadoEm: FieldValue.serverTimestamp()
      });
      transacao.set(assinaturaRef, {
        schemaVersion: 1,
        plano: "premium",
        ciclo: "teste",
        status: "ativo",
        testeUsado: true,
        testeInicio: FieldValue.serverTimestamp(),
        testeFim: fim,
        periodoFim: null,
        planoAgendado: null,
        origem: "teste",
        atualizadoEm: FieldValue.serverTimestamp()
      });
    });

    return {ok: true, testeFim: fim.toMillis()};
  }
);
