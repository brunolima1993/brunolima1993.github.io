"use strict";

const crypto = require("node:crypto");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {logger} = require("firebase-functions");
const {GoogleAuth} = require("google-auth-library");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue, Timestamp} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const {normalizarCompraPlay, produtoValido} = require("./billing");
const {hojeEmBrasilia, lembretesDoPerfil, montarNotificacao} = require("./notificacoes");

initializeApp();

const REGIAO = "southamerica-east1";
const QUATORZE_DIAS_MS = 14 * 24 * 60 * 60 * 1000;
const COLECAO_DISPOSITIVOS = "dispositivosPush";
const COLECAO_ENVIOS = "enviosNotificacao";
const CENTO_E_VINTE_DIAS_MS = 120 * 24 * 60 * 60 * 1000;
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;
const URL_APP = "https://www.tmycar.com.br/";
const USUARIOS_EM_PARALELO = 10;
const PACOTE_ANDROID = "br.com.tmycar.app";
const ESCOPO_PLAY = "https://www.googleapis.com/auth/androidpublisher";
const googleAuth = new GoogleAuth({scopes: [ESCOPO_PLAY]});

function hash(valor) {
  return crypto.createHash("sha256").update(String(valor), "utf8").digest("hex");
}

function validarConta(request) {
  const auth = request.auth;
  if (!auth) throw new HttpsError("unauthenticated", "Entre na conta para continuar.");
  if (auth.token.email_verified !== true)
    throw new HttpsError("permission-denied", "Confirme seu e-mail para continuar.");
  return auth;
}

function validarTokenPush(valor) {
  const token = String(valor || "").trim();
  if (token.length < 20 || token.length > 4096 || /\s/.test(token))
    throw new HttpsError("invalid-argument", "Identificador de notificação inválido.");
  return token;
}

function identificadorBeneficio(email) {
  return crypto
    .createHash("sha256")
    .update(String(email || "").trim().toLowerCase(), "utf8")
    .digest("hex");
}

function valorEmMs(valor) {
  if (!valor) return 0;
  if (typeof valor.toMillis === "function") return valor.toMillis();
  if (valor instanceof Date) return valor.getTime();
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function validarTokenCompra(valor) {
  const token = String(valor || "").trim();
  if (token.length < 20 || token.length > 4096 || /\s/.test(token))
    throw new HttpsError("invalid-argument", "Comprovante de compra inválido.");
  return token;
}

async function clienteGooglePlay() {
  return googleAuth.getClient();
}

async function consultarCompraGooglePlay(purchaseToken) {
  const cliente = await clienteGooglePlay();
  const token = encodeURIComponent(purchaseToken);
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACOTE_ANDROID}/purchases/subscriptionsv2/tokens/${token}`;
  const resposta = await cliente.request({url, method: "GET"});
  return resposta.data;
}

async function confirmarCompraGooglePlay(productId, purchaseToken) {
  const cliente = await clienteGooglePlay();
  const produto = encodeURIComponent(productId);
  const token = encodeURIComponent(purchaseToken);
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACOTE_ANDROID}/purchases/subscriptions/${produto}/tokens/${token}:acknowledge`;
  await cliente.request({url, method: "POST", data: {}});
}

async function registrarResultadoCompra({uid, productId, purchaseToken, compra, origem}) {
  const resultado = normalizarCompraPlay(compra, productId);
  const banco = getFirestore();
  const tokenHash = hash(purchaseToken);
  const compraRef = banco.collection("comprasGooglePlay").doc(tokenHash);
  const assinaturaRef = banco.collection("assinaturas").doc(uid);

  await banco.runTransaction(async transacao => {
    const [compraDoc, assinaturaDoc] = await Promise.all([
      transacao.get(compraRef),
      transacao.get(assinaturaRef)
    ]);
    const compraAnterior = compraDoc.exists ? compraDoc.data() : null;
    if (compraAnterior && compraAnterior.uid && compraAnterior.uid !== uid)
      throw new HttpsError("permission-denied", "Esta compra já está vinculada a outra conta.");

    const assinaturaAnterior = assinaturaDoc.exists ? assinaturaDoc.data() : {};
    const hashAnterior = String(assinaturaAnterior.purchaseTokenHash || "");
    let compraAnteriorRef = null;
    let compraAnteriorDoc = null;
    if (resultado.ativo && hashAnterior && hashAnterior !== tokenHash) {
      compraAnteriorRef = banco.collection("comprasGooglePlay").doc(hashAnterior);
      compraAnteriorDoc = await transacao.get(compraAnteriorRef);
    }

    transacao.set(compraRef, {
      schemaVersion: 1,
      uid,
      packageName: PACOTE_ANDROID,
      productId,
      purchaseToken,
      purchaseTokenHash: tokenHash,
      ciclo: resultado.ciclo,
      estadoGoogle: resultado.estadoGoogle,
      ativo: resultado.ativo,
      renovacaoAutomatica: resultado.renovacaoAutomatica,
      periodoInicio: resultado.inicioEmMs ? Timestamp.fromMillis(resultado.inicioEmMs) : null,
      periodoFim: Timestamp.fromMillis(resultado.expiraEmMs),
      pedido: resultado.pedido,
      origem,
      atualizadoEm: FieldValue.serverTimestamp()
    }, {merge: true});

    if (resultado.ativo) {
      if (compraAnteriorRef && compraAnteriorDoc && compraAnteriorDoc.exists) {
        transacao.set(compraAnteriorRef, {
          ativo: false,
          substituidaPor: tokenHash,
          atualizadoEm: FieldValue.serverTimestamp()
        }, {merge: true});
      }
      transacao.set(assinaturaRef, {
        schemaVersion: 2,
        plano: "premium",
        ciclo: resultado.ciclo,
        status: "ativo",
        testeUsado: assinaturaAnterior.testeUsado === true,
        testeInicio: assinaturaAnterior.testeInicio || null,
        testeFim: assinaturaAnterior.testeFim || null,
        periodoInicio: resultado.inicioEmMs ? Timestamp.fromMillis(resultado.inicioEmMs) : null,
        periodoFim: Timestamp.fromMillis(resultado.expiraEmMs),
        renovacaoAutomatica: resultado.renovacaoAutomatica,
        productId,
        purchaseTokenHash: tokenHash,
        planoAgendado: null,
        origem: "google-play",
        atualizadoEm: FieldValue.serverTimestamp()
      }, {merge: false});
    } else if (hashAnterior === tokenHash) {
      transacao.set(assinaturaRef, {
        schemaVersion: 2,
        plano: "free",
        ciclo: resultado.ciclo,
        status: "inativo",
        testeUsado: assinaturaAnterior.testeUsado === true,
        testeInicio: assinaturaAnterior.testeInicio || null,
        testeFim: assinaturaAnterior.testeFim || null,
        periodoInicio: resultado.inicioEmMs ? Timestamp.fromMillis(resultado.inicioEmMs) : null,
        periodoFim: Timestamp.fromMillis(resultado.expiraEmMs),
        renovacaoAutomatica: false,
        productId,
        purchaseTokenHash: tokenHash,
        planoAgendado: null,
        origem: "google-play",
        atualizadoEm: FieldValue.serverTimestamp()
      }, {merge: false});
    }
  });

  return {...resultado, tokenHash};
}

function mensagemErroGooglePlay(erro) {
  const status = Number(erro && erro.response && erro.response.status);
  if (status === 404) return new HttpsError("not-found", "A Google Play não encontrou esta compra.");
  if (status === 401 || status === 403)
    return new HttpsError("failed-precondition", "A validação da Google Play ainda não está autorizada no servidor.");
  return new HttpsError("unavailable", "Não foi possível confirmar a assinatura na Google Play agora.");
}

exports.ativarTesteGratis = onCall(
  {
    region: REGIAO,
    enforceAppCheck: true,
    timeoutSeconds: 15,
    memory: "256MiB",
    maxInstances: 10
  },
  async request => {
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

    const resultado = await banco.runTransaction(async transacao => {
      const [assinatura, beneficio] = await Promise.all([
        transacao.get(assinaturaRef),
        transacao.get(beneficioRef)
      ]);
      const atual = assinatura.exists ? assinatura.data() : null;
      if (atual && atual.plano === "premium" && atual.status === "ativo") {
        const fimAtual = valorEmMs(atual.testeFim);
        if (atual.ciclo === "teste" && fimAtual > agora)
          return {restaurado: false, jaAtivo: true, testeFim: fimAtual};
        throw new HttpsError("failed-precondition", "A conta já possui Premium ativo.");
      }

      if (beneficio.exists) {
        const dadosBeneficio = beneficio.data() || {};
        const uidAnterior = String(dadosBeneficio.uid || "");
        const assinaturaAnteriorRef = uidAnterior && uidAnterior !== auth.uid
          ? banco.collection("assinaturas").doc(uidAnterior)
          : null;
        const assinaturaAnteriorDoc = assinaturaAnteriorRef
          ? await transacao.get(assinaturaAnteriorRef)
          : null;
        const assinaturaAnterior = assinaturaAnteriorDoc && assinaturaAnteriorDoc.exists
          ? assinaturaAnteriorDoc.data() : null;
        const inicioMs = valorEmMs(dadosBeneficio.testeInicio)
          || valorEmMs(assinaturaAnterior && assinaturaAnterior.testeInicio)
          || valorEmMs(dadosBeneficio.criadoEm);
        const fimMs = valorEmMs(dadosBeneficio.testeFim)
          || valorEmMs(assinaturaAnterior && assinaturaAnterior.testeFim)
          || (inicioMs ? inicioMs + QUATORZE_DIAS_MS : 0);

        if (fimMs <= agora)
          throw new HttpsError("already-exists", "O teste grátis já foi utilizado.");

        const inicio = inicioMs ? Timestamp.fromMillis(inicioMs) : FieldValue.serverTimestamp();
        const fimRestaurado = Timestamp.fromMillis(fimMs);
        transacao.set(assinaturaRef, {
          schemaVersion: 1,
          plano: "premium",
          ciclo: "teste",
          status: "ativo",
          testeUsado: true,
          testeInicio: inicio,
          testeFim: fimRestaurado,
          periodoFim: null,
          planoAgendado: null,
          origem: "teste-restaurado",
          atualizadoEm: FieldValue.serverTimestamp()
        });
        transacao.set(beneficioRef, {
          uid: auth.uid,
          testeInicio: inicio,
          testeFim: fimRestaurado,
          transferidoEm: FieldValue.serverTimestamp()
        }, {merge: true});
        if (assinaturaAnteriorRef) transacao.delete(assinaturaAnteriorRef);
        return {restaurado: true, jaAtivo: false, testeFim: fimMs};
      }

      if (atual && atual.testeUsado === true)
        throw new HttpsError("already-exists", "O teste grátis já foi utilizado.");

      transacao.set(beneficioRef, {
        uid: auth.uid,
        criadoEm: FieldValue.serverTimestamp(),
        testeInicio: FieldValue.serverTimestamp(),
        testeFim: fim
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
      return {restaurado: false, jaAtivo: false, testeFim: fim.toMillis()};
    });

    return {ok: true, ...resultado};
  }
);

/* O navegador entrega apenas produto e token. O servidor consulta a API da
   Google Play, vincula o token a um único UID e só então libera o Premium. */
exports.validarAssinaturaGooglePlay = onCall(
  {
    region: REGIAO,
    enforceAppCheck: true,
    timeoutSeconds: 30,
    memory: "256MiB",
    maxInstances: 10
  },
  async request => {
    const auth = validarConta(request);
    const productId = String(request.data && request.data.productId || "").trim();
    if (!produtoValido(productId))
      throw new HttpsError("invalid-argument", "Plano da Google Play inválido.");
    const purchaseToken = validarTokenCompra(request.data && request.data.purchaseToken);

    try {
      const compra = await consultarCompraGooglePlay(purchaseToken);
      const resultado = await registrarResultadoCompra({
        uid: auth.uid,
        productId,
        purchaseToken,
        compra,
        origem: "app"
      });
      if (!resultado.ativo)
        throw new HttpsError("failed-precondition", "A assinatura ainda não está ativa na Google Play.");
      if (resultado.precisaConfirmacao) await confirmarCompraGooglePlay(productId, purchaseToken);
      return {
        ok: true,
        ciclo: resultado.ciclo,
        periodoFim: new Date(resultado.expiraEmMs).toISOString(),
        renovacaoAutomatica: resultado.renovacaoAutomatica
      };
    } catch (erro) {
      if (erro instanceof HttpsError) throw erro;
      logger.error("Falha ao validar assinatura da Google Play.", {
        uid: auth.uid,
        productId,
        erro: String(erro && erro.message || erro),
        status: Number(erro && erro.response && erro.response.status) || null
      });
      throw mensagemErroGooglePlay(erro);
    }
  }
);

/* Além da restauração feita ao abrir o app, a conferência periódica mantém o
   acesso correto quando há cancelamento, falha de pagamento ou expiração. */
exports.sincronizarAssinaturasGooglePlay = onSchedule(
  {
    region: REGIAO,
    schedule: "15 */6 * * *",
    timeZone: "America/Sao_Paulo",
    timeoutSeconds: 540,
    memory: "256MiB",
    maxInstances: 1
  },
  async () => {
    const snapshot = await getFirestore().collection("comprasGooglePlay")
      .where("ativo", "==", true).get();
    let atualizadas = 0;
    let falhas = 0;
    for (const doc of snapshot.docs) {
      const dados = doc.data() || {};
      if (!dados.uid || !produtoValido(dados.productId) || !dados.purchaseToken) continue;
      try {
        const compra = await consultarCompraGooglePlay(dados.purchaseToken);
        const resultado = await registrarResultadoCompra({
          uid: dados.uid,
          productId: dados.productId,
          purchaseToken: dados.purchaseToken,
          compra,
          origem: "sincronizacao"
        });
        if (resultado.ativo && resultado.precisaConfirmacao)
          await confirmarCompraGooglePlay(dados.productId, dados.purchaseToken);
        atualizadas++;
      } catch (erro) {
        falhas++;
        logger.error("Falha ao sincronizar assinatura da Google Play.", {
          compra: doc.id,
          erro: String(erro && erro.message || erro),
          status: Number(erro && erro.response && erro.response.status) || null
        });
      }
    }
    logger.info("Sincronização de assinaturas concluída.", {
      encontradas: snapshot.size,
      atualizadas,
      falhas
    });
  }
);

/* O token fica em uma coleção exclusivamente administrativa. Ele não entra no
   perfil sincronizado nem pode ser lido pelo navegador pelas Firestore Rules. */
exports.registrarDispositivoPush = onCall(
  {
    region: REGIAO,
    enforceAppCheck: true,
    timeoutSeconds: 15,
    memory: "256MiB",
    maxInstances: 20
  },
  async request => {
    const auth = validarConta(request);
    const token = validarTokenPush(request.data && request.data.token);
    const id = hash(token);
    const banco = getFirestore();
    const ref = banco.collection(COLECAO_DISPOSITIVOS).doc(id);
    const atual = await ref.get();
    const criadoEm = atual.exists && atual.data().criadoEm
      ? atual.data().criadoEm : FieldValue.serverTimestamp();
    await ref.set({
      schemaVersion: 1,
      uid: auth.uid,
      token,
      ativo: true,
      idioma: String(request.data && request.data.idioma || "pt-BR").slice(0, 20),
      plataforma: String(request.data && request.data.plataforma || "web").slice(0, 180),
      criadoEm,
      atualizadoEm: FieldValue.serverTimestamp()
    }, {merge: false});
    return {ok: true};
  }
);

exports.removerDispositivoPush = onCall(
  {
    region: REGIAO,
    enforceAppCheck: true,
    timeoutSeconds: 15,
    memory: "256MiB",
    maxInstances: 20
  },
  async request => {
    const auth = validarConta(request);
    const token = validarTokenPush(request.data && request.data.token);
    const ref = getFirestore().collection(COLECAO_DISPOSITIVOS).doc(hash(token));
    const atual = await ref.get();
    if (atual.exists && atual.data().uid === auth.uid) await ref.delete();
    return {ok: true};
  }
);

function tokenInvalido(erro) {
  const codigo = String(erro && erro.code || "");
  return codigo.includes("registration-token-not-registered") ||
    codigo.includes("invalid-registration-token") ||
    codigo.includes("invalid-argument");
}

async function reservarEnvio(banco, ref, lembrete) {
  let reservado = false;
  const agora = Date.now();
  await banco.runTransaction(async transacao => {
    const doc = await transacao.get(ref);
    if (doc.exists) {
      const dados = doc.data() || {};
      if (dados.status === "enviado") return;
      const atualizado = valorEmMs(dados.atualizadoEm);
      if (dados.status === "reservado" && agora - atualizado < SEIS_HORAS_MS) return;
    }
    transacao.set(ref, {
      schemaVersion: 1,
      uid: lembrete.uid,
      itemId: lembrete.itemId,
      parteId: lembrete.parteId || null,
      vencimento: lembrete.vencimento,
      fase: lembrete.fase,
      status: "reservado",
      atualizadoEm: FieldValue.serverTimestamp()
    }, {merge: false});
    reservado = true;
  });
  return reservado;
}

/* Envia UMA notificação por usuário com todos os lembretes do dia.
   Cada lembrete continua com sua própria reserva, então nada se repete. */
async function enviarResumo(banco, lembretes, dispositivos, hoje) {
  const reservados = [];
  for (const lembrete of lembretes) {
    const ref = banco.collection(COLECAO_ENVIOS).doc(hash(lembrete.chave));
    if (await reservarEnvio(banco, ref, lembrete)) reservados.push({lembrete, ref});
  }
  if (!reservados.length) return 0;
  const aviso = montarNotificacao(reservados.map(r => r.lembrete), hoje);
  const primeiro = reservados[0].lembrete;
  const desfazer = () => Promise.all(reservados.map(r => r.ref.delete().catch(() => false)));

  let sucessos = 0;
  try {
    for (let inicio = 0; inicio < dispositivos.length; inicio += 500) {
      const lote = dispositivos.slice(inicio, inicio + 500);
      const resposta = await getMessaging().sendEachForMulticast({
        tokens: lote.map(item => item.token),
        notification: {title: aviso.titulo, body: aviso.texto},
        data: {
          tipo: reservados.length > 1 ? "resumo" :
            (primeiro.itemId.startsWith("gasto-") ? "gasto" : "manutencao"),
          tag: aviso.tag,
          url: aviso.url,
          veic: reservados.length > 1 ? "" : String(primeiro.indiceVeiculo),
          item: reservados.length > 1 ? "" : primeiro.itemId,
          parte: reservados.length > 1 ? "" : (primeiro.parteId || ""),
          vencimento: reservados.length > 1 ? "" : primeiro.vencimento,
          quantidade: String(reservados.length)
        },
        android: {
          priority: "high",
          notification: {channelId: "maintenance", tag: aviso.tag}
        },
        webpush: {
          headers: {Urgency: "high"},
          notification: {
            icon: `${URL_APP}icons/icon-192.png`,
            badge: `${URL_APP}icons/icon-192.png`,
            tag: aviso.tag,
            renotify: false
          },
          fcmOptions: {link: aviso.url}
        }
      });
      sucessos += resposta.successCount;

      const exclusoes = [];
      resposta.responses.forEach((resultado, indice) => {
        if (!resultado.success && tokenInvalido(resultado.error))
          exclusoes.push(lote[indice].ref.delete());
      });
      await Promise.all(exclusoes);
    }

    if (!sucessos) {
      await desfazer();
      return 0;
    }
    await Promise.all(reservados.map(r => r.ref.set({
      status: "enviado",
      aparelhos: sucessos,
      atualizadoEm: FieldValue.serverTimestamp()
    }, {merge: true})));
    return reservados.length;
  } catch (erro) {
    await desfazer();
    throw erro;
  }
}

/* Roda às 09:00 de Brasília. Junta tudo do dia numa notificação por usuário.
   Para cada ciclo envia no máximo uma vez em cada etapa: manutenção em 15 dias,
   3 dias, no vencimento, semanal no 1º mês vencido e mensal até 6 meses;
   IPVA, multas e seguro somente 7 dias antes e no vencimento, enquanto não pagos. */
exports.processarNotificacoesManutencao = onSchedule(
  {
    region: REGIAO,
    schedule: "0 9 * * *",
    timeZone: "America/Sao_Paulo",
    timeoutSeconds: 540,
    memory: "512MiB",
    maxInstances: 1
  },
  async () => {
    const banco = getFirestore();
    const limiteAtividade = Date.now() - CENTO_E_VINTE_DIAS_MS;
    const dispositivosSnapshot = await banco.collection(COLECAO_DISPOSITIVOS)
      .where("ativo", "==", true).get();
    const porUsuario = new Map();
    const antigos = [];

    dispositivosSnapshot.forEach(doc => {
      const dados = doc.data() || {};
      const atualizado = valorEmMs(dados.atualizadoEm);
      if (!dados.uid || !dados.token || !atualizado || atualizado < limiteAtividade) {
        antigos.push(doc.ref.delete());
        return;
      }
      const lista = porUsuario.get(dados.uid) || [];
      lista.push({token: dados.token, ref: doc.ref});
      porUsuario.set(dados.uid, lista);
    });
    await Promise.all(antigos);

    const hoje = hojeEmBrasilia();
    let enviados = 0;
    let avaliados = 0;
    const usuarios = [...porUsuario];
    const processarUsuario = async ([uid, dispositivos]) => {
      const perfilDoc = await banco.collection("usuarios").doc(uid).get();
      if (!perfilDoc.exists) return;
      const lembretes = lembretesDoPerfil(uid, perfilDoc.data(), hoje);
      avaliados += lembretes.length;
      if (!lembretes.length) return;
      try {
        enviados += await enviarResumo(banco, lembretes, dispositivos, hoje);
      } catch (erro) {
        logger.error("Falha ao enviar lembretes de manutenção.", {
          uid,
          itens: lembretes.map(l => l.itemId),
          erro: String(erro && erro.message || erro)
        });
      }
    };
    for (let i = 0; i < usuarios.length; i += USUARIOS_EM_PARALELO)
      await Promise.all(usuarios.slice(i, i + USUARIOS_EM_PARALELO).map(processarUsuario));
    logger.info("Varredura diária de manutenção concluída.", {
      hoje,
      usuariosComAparelho: porUsuario.size,
      lembretesAvaliados: avaliados,
      lembretesEnviados: enviados
    });
  }
);
