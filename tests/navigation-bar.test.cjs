const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('navigation color stays dark in both themes and generator configuration', () => {
  const manifest = JSON.parse(read('twa-manifest.json'));
  const gradle = read('app/build.gradle');
  for (const name of ['navigationColor', 'navigationColorDark', 'navigationDividerColor', 'navigationDividerColorDark']) {
    assert.equal(manifest[name], '#02050C');
    assert.match(gradle, new RegExp(`${name}: '#02050C'`));
  }
  assert.equal(manifest.display, 'standalone');
});

test('TWA requests dark browser chrome without hiding system navigation or changing session hooks', () => {
  const launcher = read('app/src/main/java/br/com/tmycar/app/LauncherActivity.java');
  assert.match(launcher, /setNavigationBarColor\(ContextCompat.getColor\(LauncherActivity.this, R.color.navigationColor\)\)/);
  assert.match(launcher, /setColorScheme\(CustomTabsIntent.COLOR_SCHEME_DARK\)/);
  assert.match(launcher, /setAppearanceLightNavigationBars\(false\)/);
  assert.match(launcher, /adChannel.connect\(session, getProviderPackage\(\)\)/);
  assert.doesNotMatch(launcher, /IMMERSIVE|HIDE_NAVIGATION|FLAG_FULLSCREEN|\.hide\(/);
  assert.doesNotMatch(read('app/src/main/AndroidManifest.xml'), /android:value="(?:immersive|sticky-immersive)"/);
});

test('native themes request a dark navigation surface and light buttons, including Android 12+', () => {
  for (const file of ['app/src/main/res/values/styles.xml', 'app/src/main/res/values-v31/styles.xml']) {
    const xml = read(file);
    assert.match(xml, /name="android:navigationBarColor">@color\/navigationColor</);
    assert.match(xml, /name="android:windowLightNavigationBar">false</);
    assert.match(xml, /name="android:enforceNavigationBarContrast">false</);
  }
});
