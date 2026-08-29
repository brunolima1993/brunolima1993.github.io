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
    const window = { addEventListener(){} };
    const document = { visibilityState:'visible', addEventListener(){} };
    const localStorage = {
      getItem:k => memoria.has(k) ? memoria.get(k) : null,
      setItem:(k,v) => memoria.set(k,v),
      removeItem:k => memoria.delete(k)
    };
  `;
  contexto.memoria = memoria;
  vm.runInContext(
    base
      + trecho('function dadosUsuarioAtual(){', 'let FILA_NUVEM')
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

test('perfil e cache local não contêm autoridade de assinatura ou teste', () => {
  const c = ambienteDeEstado();
  const resultado = vm.runInContext(`(() => {
    PLANO = 'premium'; CICLO = 'teste'; TRIAL.usado = true;
    PLANO_ATE = '2099-01-01'; PLANO_AGENDADO = 'free';
    return { perfil:dadosUsuarioAtual(), local:estadoAtual() };
  })()`, c);

  for (const campo of ['PLANO', 'CICLO', 'TRIAL', 'PLANO_ATE', 'PLANO_AGENDADO', 'CONTA']) {
    assert.equal(campo in resultado.perfil, false, `${campo} não pode ir para /usuarios`);
    if(campo !== 'CONTA')
      assert.equal(campo in resultado.local, false, `${campo} não pode voltar do localStorage`);
  }
  assert.equal('CONTA' in resultado.local, true);
});

test('abrir a conta não transforma cache antigo em alteração mais recente', async () => {
  const c = ambienteDeEstado();
  const resultado = await vm.runInContext(`(async() => {
    carregado = true;
    ULTIMA_GRAVACAO = 123456;
    ALTERACOES_PENDENTES = false;
    await persistirLocal(false);
    const apenasCache = { em:ULTIMA_GRAVACAO, pendente:ALTERACOES_PENDENTES };
    await persistirLocal(true);
    const alteracaoReal = { em:ULTIMA_GRAVACAO, pendente:ALTERACOES_PENDENTES };
    return { apenasCache, alteracaoReal };
  })()`, c);

  assert.equal(resultado.apenasCache.em, 123456);
  assert.equal(resultado.apenasCache.pendente, false);
  assert.ok(resultado.alteracaoReal.em > 123456);
  assert.equal(resultado.alteracaoReal.pendente, true);
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
  assert.match(sw, /tmycar-pwa-v1\.5\.55/);
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

test('erros de login não permitem descobrir se um e-mail está cadastrado', () => {
  const contexto = vm.createContext({ console });
  vm.runInContext(trecho('const CANCELOU =', 'function temFirebase'), contexto);
  const mensagens = vm.runInContext(`({
    inexistente: erroAuth({ code:'auth/user-not-found' }),
    senhaErrada: erroAuth({ code:'auth/wrong-password' }),
    credencialInvalida: erroAuth({ code:'auth/invalid-credential' }),
    duplicado: erroAuth({ code:'auth/email-already-in-use' })
  })`, contexto);

  assert.equal(mensagens.inexistente, mensagens.senhaErrada);
  assert.equal(mensagens.inexistente, mensagens.credencialInvalida);
  assert.doesNotMatch(mensagens.duplicado, /já (tem|existe|foi cadastrado)/i);
  assert.doesNotMatch(html, /Não encontramos conta com esse e-mail/i);

  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  assert.match(sw, /tmycar-pwa-v1\.5\.55/);
});

test('novas senhas exigem comprimento forte sem bloquear contas antigas', () => {
  assert.match(html, /id="obSenhaCriar"[^>]*minlength="12"[^>]*maxlength="128"/);
  assert.match(html, /id="obSenhaConfirmar"[^>]*minlength="12"[^>]*maxlength="128"/);
  assert.match(html, /const TAMANHO_MINIMO_NOVA_SENHA = 12/);
  assert.match(html, /s\.length < TAMANHO_MINIMO_NOVA_SENHA/);
  assert.match(html, /function atualizarForcaSenha\(\)/);

  /* O login mantém compatibilidade com senhas antigas já aceitas pelo Firebase. */
  assert.match(html, /async function entrarConta\(\)[\s\S]*?if\(s\.length < 6\)/);
  assert.doesNotMatch(html, /Mínimo 6 caracteres/);

  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  assert.match(sw, /tmycar-pwa-v1\.5\.55/);
});

test('indicador de senha acompanha o comprimento sem exigir composição', () => {
  const elementos = {
    obSenhaCriar: { value:'' },
    forcaSenha: { dataset:{} },
    forcaSenhaBar: { style:{} },
    forcaSenhaTexto: { textContent:'' }
  };
  const contexto = vm.createContext({
    console,
    $: id => elementos[id]
  });
  vm.runInContext(
    trecho('const TAMANHO_MINIMO_NOVA_SENHA = 12;', 'function emailDaTelaDeAcesso'),
    contexto
  );

  elementos.obSenhaCriar.value = 'frase curta';
  vm.runInContext('atualizarForcaSenha()', contexto);
  assert.equal(elementos.forcaSenha.dataset.nivel, 'curta');
  assert.match(elementos.forcaSenhaTexto.textContent, /Falta 1 caractere/);

  elementos.obSenhaCriar.value = 'uma frase de senha simples';
  vm.runInContext('atualizarForcaSenha()', contexto);
  assert.equal(elementos.forcaSenha.dataset.nivel, 'forte');
  assert.equal(elementos.forcaSenhaBar.style.width, '100%');
});

test('sincronização entre aparelhos inicia imediatamente e sobrevive a retomadas', () => {
  const inicializacao = trecho('function iniciarFirebase(){', 'const CANCELOU =');
  assert.match(inicializacao, /NUVEM\.enablePersistence\(\{ synchronizeTabs:true \}\)/);
  assert.ok(
    inicializacao.indexOf('NUVEM.enablePersistence') < inicializacao.indexOf('AUTH.onAuthStateChanged'),
    'a persistência precisa ser preparada antes do observador de login'
  );

  const nuvem = trecho('let FILA_NUVEM', 'let IMPORTACAO_ANONIMA_DISPONIVEL');
  assert.match(nuvem, /function enfileirarNaNuvem/);
  assert.match(nuvem, /return enfileirarNaNuvem\(uidDestino, pacote\)/);
  assert.doesNotMatch(nuvem, /setTimeout/);
  assert.doesNotMatch(nuvem, /\.catch\(\(\) => \{\}\)/);

  assert.match(html, /document\.addEventListener\('visibilitychange'/);
  assert.match(html, /window\.addEventListener\('online', sincronizarAoRetomar\)/);
  assert.match(html, /PENDENTE_NUVEM:ALTERACOES_PENDENTES/);
  assert.match(html, /persistirLocal\(marcarAlteracao=true\)/);
  assert.match(html, /em: ULTIMA_GRAVACAO \|\| Date\.now\(\)/);
  assert.match(html, /\.onSnapshot\([\s\S]*includeMetadataChanges:true/);
  assert.match(html, /doc\.metadata\.hasPendingWrites/);
  assert.match(html, /doc\.metadata\.fromCache/);
});

test('assinatura é lida em tempo real e nunca gravada pelo navegador', () => {
  const entrada = trecho('function sincronizarContaAutenticada(u){', 'function pararOuvinteNuvem(){');
  assert.match(html, /collection\('assinaturas'\)\.doc\(UID\)\.get\(\)/);
  assert.match(html, /collection\('assinaturas'\)\.doc\(uidConta\)\.onSnapshot\(/);
  assert.ok(entrada.indexOf('const resultado = await puxarDaNuvem();') < entrada.indexOf('await puxarAssinatura();'));
  assert.doesNotMatch(html, /collection\('assinaturas'\)[\s\S]{0,120}\.set\(/);
  assert.doesNotMatch(html, /collection\('assinaturas'\)[\s\S]{0,120}\.update\(/);
  assert.match(html, /PLANO\/CICLO\/TRIAL de versões anteriores são ignorados/);
});

test('assinatura vencida volta ao grátis e teste vigente libera Premium', () => {
  const contexto = vm.createContext({ console, Date, Number, JSON });
  vm.runInContext(`
    const iso = d => d.toISOString().slice(0,10);
  ` + trecho('function valorEmMs(v){', 'function aplicarAssinatura(d, avisar=false){'), contexto);
  const agora = Date.now();
  const resultado = vm.runInContext(`(() => ({
    teste: normalizarAssinatura({
      plano:'premium', ciclo:'teste', status:'ativo', testeUsado:true,
      testeFim:${agora + 86400000}
    }),
    vencida: normalizarAssinatura({
      plano:'premium', ciclo:'anual', status:'ativo', testeUsado:true,
      periodoFim:${agora - 86400000}
    })
  }))()`, contexto);
  assert.equal(resultado.teste.PLANO, 'premium');
  assert.equal(resultado.teste.CICLO, 'teste');
  assert.equal(resultado.vencida.PLANO, 'free');
  assert.equal(resultado.vencida.TRIAL.usado, true);
});

test('teste grátis usa função protegida, transação e App Check', () => {
  const funcao = fs.readFileSync(path.join(raiz, 'functions', 'index.js'), 'utf8');
  const publicador = fs.readFileSync(path.join(raiz, 'PUBLICAR-ASSINATURAS.cmd'), 'utf8');
  assert.match(html, /FUNCTIONS\.httpsCallable\('ativarTesteGratis'\)/);
  assert.match(funcao, /enforceAppCheck:\s*true/);
  assert.match(funcao, /consumeAppCheckToken:\s*true/);
  assert.match(funcao, /request\.app\.alreadyConsumed/);
  assert.match(funcao, /runTransaction/);
  assert.match(funcao, /collection\("beneficiosTeste"\)/);
  assert.match(funcao, /testeUsado:\s*true/);
  assert.match(publicador, /functions:ativarTesteGratis,firestore:rules/);
  assert.match(publicador, /--project tmycar-222e5/);
  assert.doesNotMatch(html, /PLANO = 'premium'; CICLO = 'teste';/);
});

test('exclusão remota mais recente substitui uma garagem local não pendente', async () => {
  const remoto = {
    VEIC: [], REGISTROS: [], AVISOS: [],
    NOTIF: { nGeral:true, nData:true, nKm:true },
    USUARIO: { nome:'Bruno' }, CONSENT: { termos:true, em:'2026-08-24' },
    ativo:null, ONBOARD:true, em:200
  };
  const contexto = vm.createContext({ console, remoto });
  vm.runInContext(`
    let UID = 'mesma-conta', ONBOARD = true, IMPORTACAO_ANONIMA_DISPONIVEL = false;
    let VEIC = [{ modelo:'Pulse' }], REGISTROS = [], AVISOS = [];
    let ULTIMA_GRAVACAO = 100, ALTERACOES_PENDENTES = false;
    const USUARIO = { nome:'Bruno' }, CONSENT = { termos:true, em:'2026-08-24' };
    let aplicou = false, reenviou = false;
    const NUVEM = { collection:() => ({ doc:() => ({
      get:async() => ({ exists:true, data:() => remoto })
    }) }) };
    function aplicarEstado(d){ VEIC = d.VEIC; ULTIMA_GRAVACAO = d.em; aplicou = true; }
    function mandarParaNuvem(){ reenviou = true; }
    function confirmar(){ throw new Error('não deve pedir confirmação sem alteração local pendente'); }
    async function temDadosAnonimosParaImportar(){ return false; }
  ` + trecho('async function puxarDaNuvem(){', 'function aplicarEstado(d){'), contexto);

  const resultado = await vm.runInContext(`(async() => {
    const retorno = await puxarDaNuvem();
    return { retorno, aplicou, reenviou, quantidade:VEIC.length };
  })()`, contexto);
  assert.equal(resultado.aplicou, true);
  assert.equal(resultado.reenviou, false);
  assert.equal(resultado.quantidade, 0);
  assert.equal(resultado.retorno.aplicadoDaNuvem, true);
});

test('Firebase SDK está fixado na versão estável selecionada', () => {
  const componentes = ['app', 'app-check', 'auth', 'firestore', 'functions'];
  for(const componente of componentes){
    assert.match(
      html,
      new RegExp(`https://www\\.gstatic\\.com/firebasejs/12\\.18\\.0/firebase-${componente}-compat\\.js`)
    );
  }
  assert.doesNotMatch(html, /firebasejs\/10\.12\.2\//);
  assert.match(html, /const VERSAO_APP = '1\.5\.55'/);

  const sw = fs.readFileSync(path.join(raiz, 'sw.js'), 'utf8');
  assert.match(sw, /tmycar-pwa-v1\.5\.55/);
});
