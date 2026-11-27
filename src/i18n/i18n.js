import { STRINGS } from './strings.js';

/**
 * Idioma del sitio. Inglés por defecto; se recuerda la elección del visitante.
 * /es/ abre en español. También se puede forzar con ?lang=es o ?lang=en en la URL.
 */
const KEY = 'dylan:lang';
const LANGS = ['en', 'es'];
const listeners = new Set();

function initial() {
  try {
    if (/^\/es(\/|$)/.test(location.pathname)) return 'es';
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
    const saved = localStorage.getItem(KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* sin almacenamiento */
  }
  return 'en';
}

export const i18n = {
  lang: initial(),
  get other() {
    return this.lang === 'en' ? 'es' : 'en';
  },
  set(lang) {
    if (!LANGS.includes(lang) || lang === this.lang) return;
    this.lang = lang;
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* sin almacenamiento */
    }
    // la URL acompaña al idioma: / en inglés, /es/ en español (cada una indexada aparte)
    try {
      const path = lang === 'es' ? '/es/' : '/';
      if (location.pathname !== path) history.replaceState(null, '', path + location.hash);
    } catch {
      /* sin history */
    }
    listeners.forEach((fn) => fn(lang));
  },
  toggle() {
    this.set(this.other);
    return this.lang;
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
document.documentElement.lang = i18n.lang;
// si arranca en español desde la raíz (elección guardada), la URL pasa a /es/
try {
  if (i18n.lang === 'es' && location.pathname === '/') history.replaceState(null, '', '/es/' + location.hash);
} catch {
  /* sin history */
}

/** Texto de la interfaz por clave. `{x}` se reemplaza con vars.x */
export function t(key, vars) {
  let s = STRINGS[i18n.lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (typeof s === 'function') return s(vars || {});
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

/** Valor de datos bilingüe: { en: '...', es: '...' } → el del idioma actual. Si es un string, lo deja igual. */
export function tr(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && ('en' in v || 'es' in v)) return v[i18n.lang] ?? v.en ?? v.es;
  return v;
}
