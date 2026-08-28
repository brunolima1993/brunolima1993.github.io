const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const raiz = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');

function trecho(inicio, fim) {
  const a = html.indexOf(inicio);
  const b = html.indexOf(fim, a);
  assert.notEqual(a, -1, `início ausente: ${inicio}`);
  assert.notEqual(b, -1, `fim ausente: ${fim}`);
  return html.slice(a, b);
}

function ambienteDeEstado() {
  const memoria = new Map();
  const contexto = vm.createContext({ console, Date, JSON, Math, setTimeout, clearTimeout });
  const base = `
    let VEIC = [], REGISTROS = [], AVISOS = [], ativo = null, veicSel = null;
    let PLANO = 'free', CICLO = 'anual';
    let TRIAL = { fim:null, usado:false, av3:false, av1:false };
    let PLANO_ATE = null, PLANO_AGENDADO = null;
    const NOTIF = { nGeral:true, nData:true, nKm:true };
    const USUARIO = { nome:'' };
    let CONSENT = { termos:false, em:null };
    let CONTA = { email:null, local:true };
    let UID = null, AUTH = null, NUVEM = null, EXCLUINDO_CONTA = false;
    let IMPORTACAO_ANONIMA_DISPONIVEL = false;
    function migrarItens(){}
    function corrigirAtivo(){}
    function mandarParaNuvem(){}
    const window = {};
    const localStorage = {
      getItem:k => memoria.has(k) ? memoria.get(k) : null,
      setItem:(k,v) => memoria.set(k,v),
      removeItem:k => memoria.delete(k)
    };
  `;
  contexto.memoria = memoria;
  vm.runInContext(
    base
      + trecho('function dadosUsuarioAtual(){', 'let envioPendente')
      + trecho("const CHAVE_LEGADA = 'tmycar:dados:v1';", 'async function carregar(){'),
    contexto
  );
  return contexto;
}

test('modo anônimo e contas diferentes permanecem isolados', async () => {
  const c = ambienteDeEstado();
  const resultado = await vm.runInContext(`(async() => {
    carregado = true;
    VEIC = [{ id:'anonimo' }];
    await persistirLocal();

    await ativarContextoUsuario({ uid:'A', email:'a@example.com' });
    const aComecouVazio = VEIC.length === 0;
    VEIC = [{ id:'usuario-a' }];
    await persistirLocal();

    await ativarContextoAnonimo();
    const anonimoVoltou = VEIC.length === 1 && VEIC[0].id === 'anonimo';

    await ativarContextoUsuario({ uid:'B', email:'b@example.com' });
    const bComecouVazio = VEIC.length === 0;
    VEIC = [{ id:'usuario-b' }];
    await persistirLocal();

    await ativarContextoUsuario({ uid:'A', email:'a@example.com' });
    const aVoltou = VEIC.length === 1 && VEIC[0].id === 'usuario-a';
    return { aComecouVazio, anonimoVoltou, bComecouVazio, aVoltou };
  })()`, c);

  assert.deepEqual(JSON.parse(JSON.stringify(resultado)), {
    aComecouVazio: true,
    anonimoVoltou: true,
    bComecouVazio: true,
    aVoltou: true
  });
});

test('perfil enviado pelo cliente não contém assinatura ou teste', () => {
  const c = ambienteDeEstado();
  const resultado = vm.runInContext(`(() => {
    PLANO = 'premium'; CICLO = 'teste'; TRIAL.usado = true;
    PLANO_ATE = '2099-01-01'; PLANO_AGENDADO = 'free';
    return { perfil:dadosUsuarioAtual(), local:estadoAtual() };
  })()`, c);

  for (const campo of ['PLANO', 'CICLO', 'TRIAL', 'PLANO_ATE', 'PLANO_AGENDADO', 'CONTA']) {
    assert.equal(campo in resultado.perfil, false, `${campo} não pode ir para /usuarios`);
    assert.equal(campo in resultado.local, true, `${campo} deve continuar no cache do protótipo`);
  }
});

test('regras negam acesso global e escrita de assinaturas', () => {
  const regras = fs.readFileSync(path.join(raiz, 'firestore.rules'), 'utf8');
  assert.match(regras, /request\.auth\.uid == uid/);
  assert.match(regras, /match \/assinaturas\/\{uid\}[\s\S]*allow write: if false/);
  assert.match(regras, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false/);
  assert.match(regras, /d\.keys\(\)\.hasOnly/);
});

test('configurações Firebase são JSON válido', () => {
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(raiz, 'firebase.json'), 'utf8')));
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(raiz, '.firebaserc'), 'utf8')));
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(raiz, 'firestore.indexes.json'), 'utf8')));
});

test('App Check Enterprise é carregado antes de Auth e Firestore', () => {
  assert.match(html, /firebase-app-check-compat\.js/);
  assert.match(html, /APP_CHECK_RECAPTCHA_ENTERPRISE_KEY\s*=\s*'6LfxB5wtAAAAAJK0EokYezZxZqjkk_41D32fw112'/);
  assert.match(html, /new firebase\.appCheck\.ReCaptchaEnterpriseProvider/);

  const inicializacao = html.indexOf('firebase.initializeApp(FIREBASE_CONFIG)');
  const appCheck = html.indexOf('iniciarAppCheck();', inicializacao);
  const auth = html.indexOf('AUTH  = firebase.auth();', inicializacao);
  const firestore = html.indexOf('NUVEM = firebase.firestore();', inicializacao);
  assert.ok(inicializacao >= 0 && appCheck > inicializacao);
  assert.ok(appCheck < auth && appCheck < firestore);

  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  assert.match(sw, /tmycar-pwa-v1\.5\.49/);
});

test('JavaScript interno do aplicativo permanece sintaticamente válido', () => {
  const scripts = Array.from(html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi))
    .filter(resultado => !/type=["']application\/json["']/i.test(resultado[1]))
    .map(resultado => resultado[2])
    .filter(codigo => codigo.trim());
  assert.ok(scripts.length > 0);
  scripts.forEach((codigo, indice) => {
    assert.doesNotThrow(() => new vm.Script(codigo), `script interno ${indice + 1}`);
  });
});
