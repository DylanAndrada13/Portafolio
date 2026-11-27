import { defineConfig } from 'vite';
import { resolve, join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const load = (file) => import(`${pathToFileURL(resolve(process.cwd(), file)).href}?t=${Date.now()}`);

/**
 * Dirección pública del sitio (para Google y para la vista previa al compartir).
 * - En Vercel se completa sola con tu dominio de producción.
 * - Si usás un dominio propio, podés forzarla con la variable SITE_URL
 *   (en Vercel: Settings → Environment Variables → SITE_URL = https://tudominio.com).
 */
function siteUrl() {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  return raw.replace(/\/+$/, '');
}

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const strip = (v) => String(v).replace(/\*/g, '');

/**
 * Texto real (no dibujado en el canvas) para buscadores y lectores de pantalla:
 * quién sos, qué hacés, tus proyectos y cómo contactarte. Sale de los mismos datos
 * que usa el sitio, así que se actualiza solo.
 */
async function seoContent() {
  const { projects } = await load('src/data/projects.js');
  const { profile } = await load('src/data/profile.js');
  const { STRINGS } = await load('src/i18n/strings.js');
  const en = STRINGS.en;
  const es = STRINGS.es;
  const c = profile.contact;
  const list = projects
    .map((p) => {
      const link = p.url || p.repo;
      const title = link ? `<a href="${esc(link)}">${esc(p.title)}</a>` : esc(p.title);
      const d = p.desc || {};
      return `<li><h3>${title}</h3><p>${esc(d.en || '')}</p><p lang="es">${esc(d.es || '')}</p></li>`;
    })
    .join('');
  const links = [
    `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`,
    c.github && `<a href="${esc(c.github)}" rel="me">GitHub</a>`,
    c.instagram && `<a href="${esc(c.instagram)}" rel="me">Instagram</a>`,
    c.linkedin && `<a href="${esc(c.linkedin)}" rel="me">LinkedIn</a>`,
  ].filter(Boolean);
  return `<section class="seo-content" aria-label="Dylan Andrada">
      <h1>Dylan Andrada | Web Developer &amp; Marketing</h1>
      <p>${esc(strip(en['landing.role']))} ${esc(en['landing.lead'])}</p>
      <p lang="es">${esc(strip(es['landing.role']))} ${esc(es['landing.lead'])}</p>
      <h2>What I do · Qué hago</h2>
      <ul>${en['landing.do'].map((x, i) => `<li>${esc(x)} · <span lang="es">${esc(es['landing.do'][i])}</span></li>`).join('')}</ul>
      <h2>About · Sobre mí</h2>
      ${profile.about.en.map((x) => `<p>${esc(x)}</p>`).join('')}
      ${profile.about.es.map((x) => `<p lang="es">${esc(x)}</p>`).join('')}
      <h2>Projects · Proyectos</h2>
      <ul>${list}</ul>
      <h2>Contact · Contacto</h2>
      <p>${links.join(' · ')}</p>
      <p>Lanús, Buenos Aires, Argentina</p>
    </section>`;
}

/** Completa las URLs absolutas del HTML y genera robots.txt + sitemap.xml al compilar. */
function seo() {
  const url = siteUrl();
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: 'dylan-seo',
    transformIndexHtml: {
      order: 'pre', // antes de que Vite lea los links del HTML
      async handler(html) {
        // sin dominio (en local) se usan rutas relativas
        html = html.replaceAll('%SITE_URL%', url);
        return html.replace('<!--seo-content-->', await seoContent());
      },
    },
    async writeBundle(options) {
      // versión en español en /es/ (misma app, con título, descripción y URL propios)
      const out = options.dir;
      const { STRINGS } = await load('src/i18n/strings.js');
      const es = STRINGS.es;
      const ogEs = 'Tu negocio puede vender más. Yo me encargo de que pase: webs, sistemas y automatizaciones, con cabeza de marketing.';
      let html = (await readFile(join(out, 'index.html'), 'utf8'))
        .replace('<html lang="en">', '<html lang="es">')
        .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(es['meta.description'])}"`)
        .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(ogEs)}"`)
        .replace(/(<meta name="twitter:description" content=")[^"]*"/, `$1${esc(ogEs)}"`)
        .replace('<meta property="og:locale" content="en_US" />', '<meta property="og:locale" content="es_AR" />')
        .replace('<meta property="og:locale:alternate" content="es_AR" />', '<meta property="og:locale:alternate" content="en_US" />');
      if (url) {
        html = html
          .replace(`<link rel="canonical" href="${url}/" />`, `<link rel="canonical" href="${url}/es/" />`)
          .replace(`<meta property="og:url" content="${url}/" />`, `<meta property="og:url" content="${url}/es/" />`);
      }
      await mkdir(join(out, 'es'), { recursive: true });
      await writeFile(join(out, 'es', 'index.html'), html);
    },
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', ''];
      if (url) robots.push(`Sitemap: ${url}/sitemap.xml`, '');
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') });

      if (!url) return;
      const alt = ['en', 'es', 'x-default']
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url}/${l === 'es' ? 'es/' : ''}"/>`)
        .join('\n');
      const entry = (loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n${alt}\n  </url>`;
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entry(`${url}/`)}
${entry(`${url}/es/`)}
</urlset>
`;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}

export default defineConfig({
  plugins: [seo()],
});
