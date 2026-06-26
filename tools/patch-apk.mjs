#!/usr/bin/env node
// Parametrized World Flipper CN APK patcher.
// Bakes the local server host into the main SWF (apiServer host) and enables sdkDummy
// (bypasses the Leiting SDK login), then repacks + zipaligns + signs the APK.
//
// Pipeline (all proven from the working build):
//   extract SWF -> FFDec export 2 config classes -> string-patch -> FFDec -replace
//   -> jar uf0 (store) back into an APK copy -> zipalign -> apksigner sign -> verify
//
// Prints "STEP <n>/<total> <label>" progress lines to stdout (the launcher streams these),
// and "DONE <outPath>" on success. Exits non-zero with "ERROR <msg>" on failure.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, copyFileSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// Bundled tools live in ../resources relative to this script (dev: <launcher>/resources; packaged: <resource_dir>/resources).
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RES = path.join(SCRIPT_DIR, '..', 'resources');

// ---- args ----
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  })
);

const APK = args.apk;
const HOST = args.host;          // e.g. 192.168.68.103
const PORT = args.port;          // e.g. 8001
const OUT = args.out;            // output patched apk path
// tool paths (defaults = located dev paths; P3 will bundle + override these)
const FFDEC = args.ffdec || path.join(RES, 'tools', 'ffdec', 'ffdec.jar');
const JDK_BIN = args['jdk-bin'] || path.join(RES, 'jdk', 'bin');
const BUILD_TOOLS = args['build-tools'] || path.join(RES, 'build-tools');
const KEYSTORE = args.keystore;  // launcher-owned keystore path (created if missing)
const WORK = args.work || path.join(os.tmpdir(), 'wf-apk-patch');

const SWF_REL = 'assets/worldflipper_android_release.swf';
const CLASS_CORE = 'pinball.config.core.DevConfig';
const CLASS_GF = 'pinball.config.gbits.DevConfig_gf_android';
const CLASS_FR = 'pinball.asset.file.FileReader';

const JAVA = path.join(JDK_BIN, 'java.exe');
const JAR = path.join(JDK_BIN, 'jar.exe');
const KEYTOOL = path.join(JDK_BIN, 'keytool.exe');
const ZIPALIGN = path.join(BUILD_TOOLS, 'zipalign.exe');
const APKSIGNER_JAR = path.join(BUILD_TOOLS, 'lib', 'apksigner.jar');
// headless=true: FFDec inits AWT on the AS3 recompile path and HANGS in a no-display
// sandbox without it. -Xmx: the recompile needs heap. UTF-8: avoid argv mojibake.
const JOPTS = ['-Djava.awt.headless=true', '-Xmx3g', '-Dfile.encoding=UTF-8', '-Dsun.jnu.encoding=UTF-8'];

const TOTAL = 8;
let step = 0;
const progress = (label) => console.log(`STEP ${++step}/${TOTAL} ${label}`);
const fail = (msg) => { console.log('ERROR ' + msg); process.exit(1); };
// Stream the tool's stdout+stderr live to our stdout (the launcher tails it line by line),
// so slow steps like FFDec -replace show real-time progress instead of hanging silently.
const run = (file, fileArgs, opts = {}) => {
  const r = spawnSync(file, fileArgs, { stdio: ['ignore', 'inherit', 'inherit'], ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`${path.basename(file)} 失敗 (exit ${r.status})`);
  return r;
};
// Capture variant (for when we need to inspect the output, e.g. apksigner verify).
const runCapture = (file, fileArgs, opts = {}) =>
  execFileSync(file, fileArgs, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const runJavaJar = (jar, jarArgs) => run(JAVA, [...JOPTS, '-jar', jar, ...jarArgs]);

function need(p, what) { if (!existsSync(p)) fail(`找不到${what}：${p}`); }

try {
  if (!APK || !HOST || !PORT || !OUT) fail('缺少參數 --apk --host --port --out');
  need(APK, '原始 APK');
  need(JAVA, 'java.exe'); need(JAR, 'jar.exe'); need(KEYTOOL, 'keytool.exe');
  need(FFDEC, 'ffdec.jar'); need(ZIPALIGN, 'zipalign.exe'); need(APKSIGNER_JAR, 'apksigner.jar');

  rmSync(WORK, { recursive: true, force: true });
  mkdirSync(path.join(WORK, 'repack', 'assets'), { recursive: true });
  const appSwf = path.join(WORK, 'app.swf');
  const patchedSwf = path.join(WORK, 'app-patched.swf');
  const scriptsDir = path.join(WORK, 'scripts');

  // Copy the input APK to an ASCII work path first — Java tools (jar) mangle
  // non-ASCII argv paths on Windows (system codepage), so never hand them the
  // original path (which may contain Chinese / spaces).
  const apkSrc = path.join(WORK, 'input.apk');
  copyFileSync(APK, apkSrc);

  // 1) extract main SWF from the APK copy (jar x into a staging dir)
  progress('解開主 SWF');
  const exDir = path.join(WORK, 'extract');
  mkdirSync(exDir, { recursive: true });
  run(JAR, ['xf', apkSrc, SWF_REL], { cwd: exDir });
  const exSwf = path.join(exDir, SWF_REL);
  need(exSwf, '解出的 SWF');
  copyFileSync(exSwf, appSwf);

  // 2) FFDec export the 2 config classes to AS3
  progress('反編譯 DevConfig 類別');
  runJavaJar(FFDEC, ['-selectclass', `${CLASS_CORE},${CLASS_GF},${CLASS_FR}`, '-export', 'script', scriptsDir, appSwf]);
  const asCore = path.join(scriptsDir, 'scripts', 'pinball', 'config', 'core', 'DevConfig.as');
  const asGf = path.join(scriptsDir, 'scripts', 'pinball', 'config', 'gbits', 'DevConfig_gf_android.as');
  const asFr = path.join(scriptsDir, 'scripts', 'pinball', 'asset', 'file', 'FileReader.as');
  need(asCore, 'DevConfig.as'); need(asGf, 'DevConfig_gf_android.as'); need(asFr, 'FileReader.as');

  // 3) string-patch the AS3 (robust: keyed on unique substrings, not line numbers)
  progress('套用重定向 patch');
  let core = readFileSync(asCore, 'utf-8');
  const coreNew = core.replace(/public static var sdkDummy:Boolean(\s*=\s*false)?\s*;/,
    'public static var sdkDummy:Boolean = true;');
  if (coreNew === core) fail('DevConfig.as 找不到 sdkDummy 宣告');
  let gf = readFileSync(asGf, 'utf-8');
  const gfNew = gf.replace(/ApiServerKind\.Custom\("https?","[^"]*"\)/,
    `ApiServerKind.Custom("http","${HOST}:${PORT}")`);
  if (gfNew === gf) fail('DevConfig_gf_android.as 找不到 apiServer 設定');
  const pCore = path.join(WORK, 'DevConfig.as');
  const pGf = path.join(WORK, 'DevConfig_gf_android.as');
  writeFileSync(pCore, coreNew); writeFileSync(pGf, gfNew);

  // FileReader: tolerate assets the 1.8.1 client references but the 1.4.54 CDN lacks (e.g. 谢胧
  // /waterdragon_kunfu square_132). failedReadAssetFileHandler already falls back missing
  // `dynamic/*.png` to the built-in "dynamic/error/not_found" placeholder; broaden that to ANY
  // missing .png so a missing character icon renders the placeholder instead of triggering
  // asset-recovery -> C8100 crash. Only .png (images) — data/master files are untouched.
  // (Same SWF-guard technique as upstream's character_level_up_effect fix, generalized.)
  let fr = readFileSync(asFr, 'utf-8');
  const frNew = fr.replace(
    'int(param1.lastIndexOf("dynamic/",0)) == 0 && param1 != "dynamic/error/not_found" && param2 == ".png"',
    'param1 != "dynamic/error/not_found" && param2 == ".png"');
  if (frNew === fr) fail('FileReader.as 找不到 failedReadAssetFileHandler 的 dynamic png 條件');
  const pFr = path.join(WORK, 'FileReader.as');
  writeFileSync(pFr, frNew);

  // 4) FFDec -replace recompiles the patched AS3 back into the SWF (slowest step)
  progress('重編 SWF(較久,請稍候)');
  runJavaJar(FFDEC, ['-replace', appSwf, patchedSwf, CLASS_CORE, pCore, CLASS_GF, pGf, CLASS_FR, pFr]);
  need(patchedSwf, '重編後的 SWF');

  // 5) repack: copy the ASCII APK, drop patched SWF in, jar uf0 (store) to replace the entry
  progress('重組 APK');
  const workApk = path.join(WORK, 'work.apk');
  copyFileSync(apkSrc, workApk);
  copyFileSync(patchedSwf, path.join(WORK, 'repack', SWF_REL));
  run(JAR, ['uf0', path.resolve(workApk), SWF_REL], { cwd: path.join(WORK, 'repack') });

  // 6) zipalign
  progress('zipalign');
  const aligned = path.join(WORK, 'aligned.apk');
  run(ZIPALIGN, ['-p', '-f', '4', workApk, aligned]);

  // 7) ensure launcher keystore (alias wf / pass android)
  progress('準備簽名金鑰');
  const ks = KEYSTORE || path.join(WORK, 'launcher.jks');
  if (!existsSync(ks)) {
    mkdirSync(path.dirname(ks), { recursive: true });
    run(KEYTOOL, ['-genkeypair', '-keystore', ks, '-alias', 'wf', '-keyalg', 'RSA',
      '-keysize', '2048', '-validity', '10000', '-storepass', 'android', '-keypass', 'android',
      '-dname', 'CN=StartPoint CN Launcher, O=StartPoint, C=TW']);
  }

  // 8) sign + verify
  progress('簽名並驗證');
  mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  runJavaJar(APKSIGNER_JAR, ['sign', '--ks', ks, '--ks-pass', 'pass:android',
    '--ks-key-alias', 'wf', '--key-pass', 'pass:android', '--out', OUT, aligned]);
  const verify = runCapture(JAVA, [...JOPTS, '-jar', APKSIGNER_JAR, 'verify', '--verbose', OUT]).toString();
  if (!/Verifies/.test(verify)) fail('簽名驗證失敗');

  const sizeMB = (statSync(OUT).size / 1048576).toFixed(1);
  rmSync(WORK, { recursive: true, force: true });
  console.log(`DONE ${OUT} (${sizeMB}MB, host=${HOST}:${PORT})`);
} catch (e) {
  fail((e && (e.stderr ? e.stderr.toString() : e.message)) || String(e));
}
