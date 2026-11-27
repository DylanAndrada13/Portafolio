/**
 * Saca una captura de la página de inicio de cada proyecto de src/data/projects.js
 * y la guarda en public/assets/projects/<id>.jpg (la usan las tarjetas 3D).
 *
 * Uso:  npm run shots            (todas)
 *       npm run shots clawsbby   (solo esa)
 *
 * Usa el Microsoft Edge o Google Chrome instalado en la PC (playwright-core no descarga navegadores).
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { projects } = await import(pathToFileURL(path.join(root, 'src/data/projects.js')).href);
const outDir = path.join(root, 'public/assets/projects');
await mkdir(outDir, { recursive: true });

const only = process.argv[2];
const list = projects.filter((p) => p.url && (!only || p.id === only));

async function launch() {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel });
    } catch {
      /* probar el siguiente */
    }
  }
  throw new Error('No encontré Edge ni Chrome instalados.');
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const p of list) {
  process.stdout.write(`→ ${p.id}  ${p.url} ... `);
  try {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(2500); // deja terminar animaciones de entrada
    await page.screenshot({ path: path.join(outDir, `${p.id}.jpg`), type: 'jpeg', quality: 82 });
    console.log('ok');
  } catch (err) {
    console.log('error:', err.message.split('\n')[0]);
  }
}
await browser.close();
