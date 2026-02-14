/**
 * OpenClaw 소스 압축 해제
 * 사용: OPENCLAW_ZIP="C:\Users\사용자명\Downloads\openclaw-main.zip" node scripts/extract-openclaw.js
 * 또는: npm run openclaw:extract
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEST = path.join(PROJECT_ROOT, 'openclaw-src');

function getZipPath() {
  const env = process.env.OPENCLAW_ZIP || process.env.OPENCLAW_ZIP_PATH;
  if (env) return path.resolve(env);
  const userHome = process.env.USERPROFILE || process.env.HOME || '';
  return path.join(userHome, 'Downloads', 'openclaw-main.zip');
}

async function extractWithJszip(zipPath, destDir) {
  const JSZip = require('jszip');
  const buf = fs.readFileSync(zipPath);
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files);
  const firstSegment = names[0].split('/')[0];
  for (const name of names) {
    const entry = zip.files[name];
    const rel = name.startsWith(firstSegment + '/') ? name.slice(firstSegment.length + 1) : name;
    const outPath = path.join(destDir, rel);
    if (entry.dir) {
      fs.mkdirSync(outPath, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const content = await entry.asNodeBuffer();
    fs.writeFileSync(outPath, content);
  }
}

async function main() {
  const zipPath = getZipPath();
  if (!fs.existsSync(zipPath)) {
    console.error('Zip not found:', zipPath);
    console.error('Set OPENCLAW_ZIP to your openclaw-main.zip path and run again.');
    process.exit(1);
  }
  if (fs.existsSync(DEST)) {
    console.log('Removing existing openclaw-src...');
    fs.rmSync(DEST, { recursive: true });
  }
  fs.mkdirSync(DEST, { recursive: true });
  console.log('Extracting', zipPath, '->', DEST);
  try {
    await extractWithJszip(zipPath, DEST);
    console.log('Done. OpenClaw source is in openclaw-src/');
    const readme = path.join(DEST, 'README.md');
    if (fs.existsSync(readme)) {
      console.log('Next: cd openclaw-src && pnpm install && pnpm build && pnpm start gateway');
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
