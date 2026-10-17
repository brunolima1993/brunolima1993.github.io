const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const raiz = path.resolve(__dirname, '../..');
const origem = path.join(raiz, 'splash-review', 'proposta-splash-estatica.svg');
const recursos = path.join(__dirname, '..', 'app', 'src', 'main', 'res');
const tamanhos = {
  'drawable-mdpi': [300, 538],
  'drawable-hdpi': [450, 808],
  'drawable-xhdpi': [600, 1077],
  'drawable-xxhdpi': [900, 1615],
  'drawable-xxxhdpi': [1200, 2154]
};

(async () => {
  if (!fs.existsSync(origem)) throw new Error(`Arte não encontrada: ${origem}`);
  const navegador = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });
  try {
    for (const [pasta, [width, height]] of Object.entries(tamanhos)) {
      const pagina = await navegador.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const url = new URL('file:///' + origem.replace(/\\/g, '/'));
      await pagina.goto(url.href, { waitUntil: 'load' });
      await pagina.screenshot({ path: path.join(recursos, pasta, 'splash.png') });
      await pagina.close();
      console.log(`${pasta}: ${width}x${height}`);
    }
  } finally {
    await navegador.close();
  }
})().catch(erro => {
  console.error(erro);
  process.exitCode = 1;
});
