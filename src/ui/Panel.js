import gsap from 'gsap';
import { sound } from '../audio/sound.js';
import { t, tr, i18n } from '../i18n/i18n.js';
import { SKILL_ICONS } from '../data/skillIcons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ICONS = { email: '✉', github: '⌥', linkedin: 'in', instagram: '◎', whatsapp: '☏' };
const LABELS = { email: 'email', github: 'GitHub', linkedin: 'LinkedIn', instagram: 'Instagram', whatsapp: 'WhatsApp' };

// el CV solo se muestra si el PDF existe (se chequea una vez)
let cvCheck = null;
function cvAvailable(url) {
  if (!url) return Promise.resolve(false);
  cvCheck ??= fetch(url, { method: 'HEAD' })
    .then((r) => r.ok && (r.headers.get('content-type') || '').includes('pdf'))
    .catch(() => false);
  return cvCheck;
}

function skillShelf(skills) {
  return skills
    .map((s) => {
      const sk = typeof s === 'string' ? { name: s } : s;
      const icon = sk.icon || sk.name.slice(0, 2);
      return `<li class="shelf__item" style="--c:${esc(sk.color || '#46dcff')}" title="${esc(sk.name)}">
          <span class="shelf__cart" aria-hidden="true">${
            SKILL_ICONS[sk.name]
              ? `<svg class="shelf__svg" viewBox="0 0 24 24"><path d="${SKILL_ICONS[sk.name]}"/></svg>`
              : `<span class="shelf__icon">${esc(icon)}</span>`
          }</span>
          <span class="shelf__name">${esc(sk.name)}</span>
        </li>`;
    })
    .join('');
}

function aboutHTML(p) {
  return `
    <p class="panel__kicker">${t('about.kicker')}</p>
    <h2 class="panel__title">${t('about.title')}</h2>
    ${tr(p.about).map((x) => `<p class="panel__text">${esc(x)}</p>`).join('')}
    <div class="panel__facts">
      ${p.facts.map(([k, v]) => `<div><span>${esc(tr(k))}</span><strong>${esc(tr(v))}</strong></div>`).join('')}
    </div>
    <p class="panel__label">${t('about.stack')}</p>
    <ul class="shelf">${skillShelf(p.skills)}</ul>
    <a class="btn btn--primary panel__cv" href="${esc(p.cv || '')}" download hidden>${t('about.cv')} <span aria-hidden="true">↓</span></a>`;
}

function linksHTML(p) {
  const links = Object.entries(p.contact).filter(([, v]) => v);
  if (!links.length) return `<p class="panel__text panel__muted">${t('contact.empty')}</p>`;
  return links
    .map(([k, v]) => {
      const href = k === 'email' ? `mailto:${v}` : v;
      const shown = k === 'email' ? v : v.replace(/^https?:\/\/(www\.)?/, '');
      return `<a class="link-row" href="${esc(href)}" target="_blank" rel="noopener" data-kind="${k}" data-value="${esc(v)}">
          <span class="link-row__icon" aria-hidden="true">${ICONS[k] || '↗'}</span>
          <span class="link-row__body"><span>${LABELS[k] || k}</span><strong>${esc(shown)}</strong></span>
          <span class="link-row__go" aria-hidden="true">↗</span>
        </a>`;
    })
    .join('');
}

function formHTML(p) {
  if (!p.formEndpoint && !p.contact.email) return '';
  return `
    <form class="cform" novalidate>
      <label class="cform__field"><span>${t('form.name')}</span><input name="name" autocomplete="name" required maxlength="80" /></label>
      <label class="cform__field"><span>${t('form.email')}</span><input name="email" type="email" autocomplete="email" required maxlength="120" /></label>
      <label class="cform__field"><span>${t('form.message')}</span><textarea name="message" rows="4" required maxlength="2000"></textarea></label>
      <input name="_gotcha" class="cform__trap" tabindex="-1" autocomplete="off" aria-hidden="true" />
      <button class="btn btn--primary cform__send" type="submit">${t('form.send')} <span aria-hidden="true">↗</span></button>
      <p class="cform__status" role="status"></p>
    </form>`;
}

function contactHTML(p) {
  const form = formHTML(p);
  return `
    <p class="panel__kicker">${t('contact.kicker')}</p>
    <h2 class="panel__title">${t('contact.title')}</h2>
    <p class="panel__text">${t('contact.text')}</p>
    ${form}
    ${form ? `<p class="panel__label">${t('contact.links')}</p>` : ''}
    <div class="panel__links">${linksHTML(p)}</div>`;
}

/** Panel HUD que aparece junto al objeto de la habitación (cuadro / ventana). */
export class Panel {
  constructor({ root, kind, side = 'right', profile, onClose }) {
    this.onClose = onClose;
    this.kind = kind;
    this.profile = profile;
    this.el = document.createElement('aside');
    this.el.className = `panel panel--${kind} panel--${side}`;
    this.el.setAttribute('role', 'dialog');
    this.el.innerHTML = `
      <button class="panel__close" type="button">×</button>
      <div class="panel__corner panel__corner--tl" aria-hidden="true"></div>
      <div class="panel__corner panel__corner--br" aria-hidden="true"></div>
      <div class="panel__inner"></div>`;
    root.appendChild(this.el);
    this.el.querySelector('.panel__close').addEventListener('click', () => this.onClose());
    this.render();
    this.offLang = i18n.onChange(() => this.render());
  }

  render() {
    const { kind, profile: p } = this;
    this.el.setAttribute('aria-label', t(kind === 'about' ? 'about.title' : 'contact.title'));
    this.el.querySelector('.panel__close').setAttribute('aria-label', t('close'));
    // si había algo escrito en el formulario, se conserva al cambiar de idioma
    const draft = this.el.querySelector('.cform') ? Object.fromEntries(new FormData(this.el.querySelector('.cform'))) : null;
    this.el.querySelector('.panel__inner').innerHTML = kind === 'about' ? aboutHTML(p) : contactHTML(p);

    if (kind === 'about') {
      const cv = this.el.querySelector('.panel__cv');
      cvAvailable(p.cv).then((ok) => (cv.hidden = !ok));
    }

    // el email además se copia al portapapeles
    this.el.querySelectorAll('[data-kind="email"]').forEach((a) =>
      a.addEventListener('click', () => {
        navigator.clipboard?.writeText(a.dataset.value).then(() => {
          const s = a.querySelector('.link-row__body span');
          s.textContent = t('contact.copied');
          setTimeout(() => (s.textContent = 'email'), 2000);
        });
      }),
    );

    const form = this.el.querySelector('.cform');
    if (form) {
      if (draft) for (const [k, v] of Object.entries(draft)) if (form.elements[k]) form.elements[k].value = v;
      form.addEventListener('submit', (e) => this.submit(e, form));
      // que escribir no dispare atajos de la habitación (Escape sí cierra)
      form.addEventListener('keydown', (e) => e.key !== 'Escape' && e.stopPropagation());
    }
  }

  async submit(e, form) {
    e.preventDefault();
    const p = this.profile;
    const status = form.querySelector('.cform__status');
    const btn = form.querySelector('.cform__send');
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    if (data._gotcha) return; // bot

    if (!p.formEndpoint) {
      const body = `${data.message}\n\n— ${data.name} (${data.email})`;
      location.href = `mailto:${p.contact.email}?subject=${encodeURIComponent(`Portfolio · ${data.name}`)}&body=${encodeURIComponent(body)}`;
      status.textContent = t('form.mailto');
      return;
    }

    btn.disabled = true;
    btn.textContent = t('form.sending');
    status.textContent = '';
    try {
      const res = await fetch(p.formEndpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, message: data.message, _subject: `Portfolio · ${data.name}` }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = t('form.ok');
      status.className = 'cform__status is-ok';
      sound.chime();
    } catch {
      status.textContent = t('form.error');
      status.className = 'cform__status is-error';
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${t('form.send')} <span aria-hidden="true">↗</span>`;
    }
  }

  open() {
    sound.blip(true);
    gsap.set(this.el, { autoAlpha: 1 });
    return gsap
      .timeline()
      .fromTo(this.el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.out' })
      .fromTo(
        this.el.querySelectorAll('.panel__inner > *'),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out', clearProps: 'opacity,visibility,transform' },
        0.15,
      );
  }

  close() {
    sound.blip(false);
    this.offLang?.();
    return new Promise((resolve) => {
      gsap.to(this.el, {
        clipPath: 'inset(100% 0 0% 0)',
        duration: 0.45,
        ease: 'expo.in',
        onComplete: () => {
          this.el.remove();
          resolve();
        },
      });
    });
  }
}
