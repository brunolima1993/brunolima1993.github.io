const path = require('path');
const fs = require('fs/promises');
const { TwaGenerator, TwaManifest, ConsoleLog } = require('@bubblewrap/core');

const projectDir = path.resolve(__dirname, '..');
const pwaDir = path.resolve(projectDir, '..', 'tmycar-pwa');
const webManifestUrl = new URL('https://www.tmycar.com.br/manifest.webmanifest');

async function applyProjectAdjustments() {
  const androidManifestPath = path.join(
    projectDir,
    'app',
    'src',
    'main',
    'AndroidManifest.xml'
  );
  const buildGradlePath = path.join(projectDir, 'app', 'build.gradle');
  const launcherActivityPath = path.join(
    projectDir,
    'app',
    'src',
    'main',
    'java',
    'br',
    'com',
    'tmycar',
    'app',
    'LauncherActivity.java'
  );
  const stylesPath = path.join(projectDir, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  const stylesV31Path = path.join(projectDir, 'app', 'src', 'main', 'res', 'values-v31', 'styles.xml');
  const transparentSplashPath = path.join(
    projectDir,
    'app',
    'src',
    'main',
    'res',
    'drawable',
    'splash_transparente.xml'
  );

  let androidManifest = await fs.readFile(androidManifestPath, 'utf8');
  androidManifest = androidManifest.replace(/\s+package="br\.com\.tmycar\.app"/, '');
  androidManifest = androidManifest.replace(
    '        android:label="@string/appName"',
    '        android:label="@string/appName"\n' +
      '        android:resizeableActivity="true"'
  );
  androidManifest = androidManifest.replace(
    '            android:label="@string/launcherName"\n            android:exported="true">',
    '            android:label="@string/launcherName"\n' +
      '            android:theme="@style/Theme.TMyCar.Starting"\n' +
      '            android:windowSoftInputMode="adjustResize"\n' +
      '            android:exported="true">'
  );
  await fs.writeFile(
    androidManifestPath,
    androidManifest,
    'utf8'
  );

  let buildGradle = await fs.readFile(buildGradlePath, 'utf8');
  buildGradle = buildGradle.replace(
    ']\n\nandroid {',
    `]\n\n` +
      `def releaseKeystoreFile = System.getenv('TMYCAR_KEYSTORE_FILE')\n` +
      `def releaseStorePassword = System.getenv('TMYCAR_STORE_PASSWORD')\n` +
      `def releaseKeyPassword = System.getenv('TMYCAR_KEY_PASSWORD')\n` +
      `def hasReleaseSigning = releaseKeystoreFile && releaseStorePassword && releaseKeyPassword\n\n` +
      `android {`
  );
  buildGradle = buildGradle.replace(
    '    namespace "br.com.tmycar.app"\n',
    `    namespace "br.com.tmycar.app"\n` +
      `    signingConfigs {\n` +
      `        release {\n` +
      `            if (hasReleaseSigning) {\n` +
      `                storeFile file(releaseKeystoreFile)\n` +
      `                storePassword releaseStorePassword\n` +
      `                keyAlias 'tmycar'\n` +
      `                keyPassword releaseKeyPassword\n` +
      `            }\n` +
      `        }\n` +
      `    }\n`
  );
  buildGradle = buildGradle.replace(
    '            minifyEnabled true\n',
    `            minifyEnabled true\n` +
      `            if (hasReleaseSigning) {\n` +
      `                signingConfig signingConfigs.release\n` +
      `            }\n`
  );
  buildGradle = buildGradle.replace(
    /implementation 'com\.google\.androidbrowserhelper:androidbrowserhelper:[^']+'/, 
    "implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.7.3'"
  );
  buildGradle = buildGradle.replace(
    "implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.7.3'",
    "implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.7.3'\n\n" +
      "        implementation 'androidx.core:core-splashscreen:1.2.0'"
  );
  await fs.writeFile(buildGradlePath, buildGradle, 'utf8');

  let launcherActivity = await fs.readFile(launcherActivityPath, 'utf8');
  launcherActivity = launcherActivity
    .replace('import android.content.pm.ActivityInfo;\n', '')
    .replace('import android.os.Build;\n', '');
  launcherActivity = launcherActivity.replace(
    'import android.widget.ImageView;\n',
    'import android.widget.ImageView;\n\nimport androidx.core.splashscreen.SplashScreen;\n'
  );
  launcherActivity = launcherActivity.replace(
    '    protected void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);',
    '    protected void onCreate(Bundle savedInstanceState) {\n' +
      '        SplashScreen.installSplashScreen(this);\n' +
      '        super.onCreate(savedInstanceState);'
  );
  launcherActivity = launcherActivity.replace(
    /        \/\/ Setting an orientation[\s\S]*?        }\n(?=    }\n\n    @Override)/,
    ''
  );
  await fs.writeFile(launcherActivityPath, launcherActivity, 'utf8');

  const baseTheme = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.TMyCar" parent="@android:style/Theme.Material.NoActionBar">
        <item name="android:windowBackground">@color/launch_background</item>
        <item name="android:windowIsTranslucent">false</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
    </style>
`;
  await fs.writeFile(
    stylesPath,
    `${baseTheme}
    <style name="Theme.TMyCar.Starting" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/launch_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_transparente</item>
        <item name="windowSplashScreenAnimationDuration">0</item>
        <item name="postSplashScreenTheme">@style/Theme.TMyCar</item>
    </style>
</resources>
`,
    'utf8'
  );
  await fs.writeFile(stylesV31Path, `${baseTheme}</resources>\n`, 'utf8');
  await fs.writeFile(
    transparentSplashPath,
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="1dp"
    android:height="1dp"
    android:viewportWidth="1"
    android:viewportHeight="1">
    <path android:fillColor="#00000000" android:pathData="M0,0h1v1h-1z" />
</vector>
`,
    'utf8'
  );
}

async function main() {
  const webManifest = JSON.parse(
    await fs.readFile(path.join(pwaDir, 'manifest.webmanifest'), 'utf8')
  );
  const manifest = TwaManifest.fromWebManifestJson(webManifestUrl, webManifest);

  manifest.packageId = 'br.com.tmycar.app';
  manifest.name = 'TMy Car';
  manifest.launcherName = 'TMy Car';
  manifest.host = 'www.tmycar.com.br';
  manifest.startUrl = '/';
  manifest.fullScopeUrl = new URL('https://www.tmycar.com.br/');
  manifest.appVersionCode = 1599;
  manifest.appVersionName = '1.5.99';
  manifest.minSdkVersion = 23;
  manifest.display = 'standalone';
  manifest.orientation = 'any';
  manifest.enableNotifications = true;
  manifest.enableSiteSettingsShortcut = true;
  manifest.fallbackType = 'customtabs';
  manifest.themeColor = '#061A35';
  manifest.themeColorDark = '#000000';
  manifest.backgroundColor = '#061A35';
  manifest.splashScreenFadeOutDuration = 140;
  manifest.features = { playBilling: { enabled: true } };
  manifest.signingKey = { path: 'android.keystore', alias: 'tmycar' };
  manifest.generatorApp = 'bubblewrap-cli';

  const manifestPath = path.join(projectDir, 'twa-manifest.json');
  await manifest.saveToFile(manifestPath);

  const generator = new TwaGenerator();
  await generator.removeTwaProject(projectDir);
  await generator.createTwaProject(
    projectDir,
    manifest,
    new ConsoleLog('TMy Car Android'),
    () => {}
  );
  await applyProjectAdjustments();

  console.log(`Projeto Android gerado em ${projectDir}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
