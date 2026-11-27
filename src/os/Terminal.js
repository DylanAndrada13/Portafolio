import { sound } from '../audio/sound.js';
import { i18n, tr } from '../i18n/i18n.js';

/** Texto según idioma: L('english', 'español') */
const L = (en, es) => (i18n.lang === 'es' ? es : en);

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Terminal jugable dentro de DYLAN OS.
 * `actions` conecta los comandos con la app (abrir proyecto, luces, tormenta...).
 */
export class Terminal {
  constructor({ projects, profile, actions }) {
    this.projects = projects;
    this.profile = profile;
    this.actions = actions;
    this.history = [];
    this.hIndex = 0;
    this.busy = Promise.resolve();

    this.el = document.createElement('section');
    this.el.className = 'term';
    this.el.setAttribute('aria-label', 'Terminal');
    this.el.innerHTML = `
      <div class="term__head"><span class="term__dots"><i></i><i></i><i></i></span><span>visitor@dylan-os: ~</span></div>
      <div class="term__out" role="log" aria-live="polite"></div>
      <form class="term__form" autocomplete="off">
        <label class="term__prompt" for="term-input">visitor@dylan-os:~$</label>
        <input id="term-input" class="term__input" spellcheck="false" autocapitalize="off" />
      </form>`;
    this.out = this.el.querySelector('.term__out');
    this.input = this.el.querySelector('.term__input');
    this.el.addEventListener('pointerdown', () => setTimeout(() => this.input.focus(), 0));
    this.el.querySelector('.term__form').addEventListener('submit', (e) => {
      e.preventDefault();
      const cmd = this.input.value.trim();
      this.input.value = '';
      if (cmd) {
        this.history.push(cmd);
        this.hIndex = this.history.length;
      }
      this.run(cmd);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key.length === 1 || e.key === 'Backspace') sound.key();
      if (e.key === 'ArrowUp' && this.history.length) {
        this.hIndex = Math.max(0, this.hIndex - 1);
        this.input.value = this.history[this.hIndex];
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        this.hIndex = Math.min(this.history.length, this.hIndex + 1);
        this.input.value = this.history[this.hIndex] || '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const match = Object.keys(this.commands()).find((c) => c.startsWith(this.input.value));
        if (match) this.input.value = match;
      }
      e.stopPropagation();
    });
    this.started = false;
  }

  focus() {
    this.input.focus({ preventScroll: true });
    if (!this.started) {
      this.started = true;
      this.print(
        [
          '<span class="t-accent">DYLAN OS</span> terminal v2.6',
          L('Type <span class="t-cmd">help</span> to see the commands.', 'Escribí <span class="t-cmd">help</span> para ver los comandos.'),
        ],
        12,
      );
    }
  }

  /** Imprime líneas con efecto de tipeo rápido. */
  print(lines, speed = 6) {
    this.busy = this.busy.then(async () => {
      for (const html of [].concat(lines)) {
        const line = document.createElement('div');
        line.className = 't-line';
        this.out.appendChild(line);
        // tipea el texto plano y al final pone el HTML con colores
        const plain = html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        for (let i = 0; i < plain.length; i += 3) {
          line.textContent = plain.slice(0, i + 3);
          this.out.scrollTop = this.out.scrollHeight;
          if (speed) await new Promise((r) => setTimeout(r, speed));
        }
        line.innerHTML = html || '&nbsp;';
        this.out.scrollTop = this.out.scrollHeight;
      }
    });
    return this.busy;
  }

  commands() {
    const p = this.profile;
    const list = this.projects;
    return {
      help: () => {
        const rows = [
          ['projects', L('list my projects', 'lista mis proyectos')],
          ['open &lt;n&gt;', L('open project number n', 'abre el proyecto número n')],
          ['about', L('about me', 'sobre mí')],
          ['contact', L('how to reach me', 'cómo contactarme')],
          ['github', L('my GitHub', 'mi GitHub')],
          ['lang', L('cambiar a español', 'switch to English')],
          ['whoami', L('who are you?', '¿quién sos vos?')],
          ['neofetch', L('system info', 'info del sistema')],
          ['lights', L('lamp on / off', 'prende / apaga la lámpara')],
          ['storm', L('summon lightning', 'invoca un relámpago')],
          ['rgb', L('gamer mode', 'modo gamer')],
          ['sound', L('sound on / off', 'activa / desactiva el sonido')],
          ['clear', L('clear the screen', 'limpia la pantalla')],
          ['exit', L('back to the room', 'volver a la habitación')],
        ];
        const pad = (c) => c + ' '.repeat(Math.max(1, 14 - c.replace(/&[lg]t;/g, '<').length));
        return [L('available commands:', 'comandos disponibles:'), ...rows.map(([c, d]) => `  <span class="t-cmd">${pad(c)}</span>${d}`)];
      },
      projects: () =>
        list.length
          ? list
              .map((x, i) => `  [${i + 1}] <span class="t-accent">${esc(x.title)}</span>  — ${esc(tr(x.description) || '')}`)
              .concat('', L('use <span class="t-cmd">open 1</span> to open one.', 'usá <span class="t-cmd">open 1</span> para abrir uno.'))
          : [L('no projects yet.', 'todavía no hay proyectos cargados.')],
      ls: () => this.commands().projects(),
      open: (arg) => {
        const i = Number(arg) - 1;
        const proj = list[i] || list.find((x) => x.id === arg);
        if (!proj) return [L(`can't find project "${esc(arg || '')}". try <span class="t-cmd">projects</span>.`, `no encuentro el proyecto "${esc(arg || '')}". probá <span class="t-cmd">projects</span>.`)];
        setTimeout(() => this.actions.openProject(proj), 350);
        return [`${L('opening', 'abriendo')} <span class="t-accent">${esc(proj.title)}</span>...`];
      },
      about: () => [...tr(p.about).map(esc), '', `stack: ${p.skills.map((x) => esc(x.name || x)).join(' · ')}`],
      github: () => {
        const url = p.contact.github;
        if (!url) return [L('no GitHub link yet.', 'todavía no hay link de GitHub.')];
        setTimeout(() => window.open(url, '_blank', 'noopener'), 300);
        return [`${L('opening', 'abriendo')} <a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>...`];
      },
      lang: (arg) => {
        const want = (arg || '').toLowerCase();
        if (want && want !== 'en' && want !== 'es') return [L('usage: lang [en|es]', 'uso: lang [en|es]')];
        if (want === i18n.lang) return [L('already in English.', 'ya está en español.')];
        const next = this.actions.toggleLang?.();
        return [next === 'es' ? 'cartucho ES insertado. ¡hola!' : 'EN cartridge inserted. hello!'];
      },
      idioma: (arg) => this.commands().lang(arg),
      language: (arg) => this.commands().lang(arg),
      contact: () => {
        const c = Object.entries(p.contact).filter(([, v]) => v);
        if (!c.length) return [L('contact info not loaded yet.', 'los datos de contacto todavía no están cargados.')];
        return c.map(([k, v]) => {
          const href = k === 'email' ? `mailto:${v}` : v;
          return `  ${k.padEnd(10, ' ')} <a href="${esc(href)}" target="_blank" rel="noopener">${esc(v)}</a>`;
        });
      },
      whoami: () => [L('visitor — someone with great taste in portfolios.', 'visitor — alguien con buen gusto para los portafolios.')],
      neofetch: () => [
        '<span class="t-accent">   ____  __  __</span>   visitor@dylan-os',
        '<span class="t-accent">  |  _ \\ \\ \\/ /</span>   ----------------',
        `<span class="t-accent">  | | | | \\  / </span>   OS: DYLAN OS 2.6`,
        `<span class="t-accent">  | |_| | /  \\ </span>   ${L('Role', 'Rol')}: ${esc(p.role)}`,
        `<span class="t-accent">  |____/ /_/\\_\\</span>   ${L('Projects', 'Proyectos')}: ${list.length}`,
        `                   Shell: dsh · ${L('Weather: rain', 'Clima: lluvia')}`,
      ],
      lights: () => {
        this.actions.toggleLamp();
        return [L('💡 switch flipped.', '💡 interruptor accionado.')];
      },
      storm: () => {
        this.actions.storm();
        return ['ϟ ϟ ϟ'];
      },
      rgb: () => {
        const on = this.actions.toggleRgb();
        return [on ? L('RGB mode on. +30 fps (not really).', 'modo RGB activado. +30 fps (no realmente).') : L('RGB mode off.', 'modo RGB desactivado.')];
      },
      sound: () => {
        this.actions.toggleSound();
        return [L('sound: toggled.', 'sonido: alternado.')];
      },
      sudo: () => [L('nice try. this incident will be reported. 👀', 'buen intento. este incidente será reportado. 👀')],
      clear: () => {
        this.out.innerHTML = '';
        return [];
      },
      exit: () => {
        setTimeout(() => this.actions.exit(), 300);
        return [L('logging out...', 'cerrando sesión...')];
      },
      hello: () => [L('hi! 👋', '¡hola! 👋')],
      hola: () => ['¡hola! 👋'],
    };
  }

  run(raw) {
    this.actions.onCommand?.();
    const line = document.createElement('div');
    line.className = 't-line t-echo';
    line.innerHTML = `<span class="t-prompt">visitor@dylan-os:~$</span> ${esc(raw)}`;
    this.out.appendChild(line);
    if (!raw) return;
    const [name, ...args] = raw.split(/\s+/);
    const cmd = this.commands()[name.toLowerCase()];
    const result = cmd
      ? cmd(args.join(' '))
      : [L(`command not found: ${esc(name)}. type <span class="t-cmd">help</span>.`, `comando no encontrado: ${esc(name)}. escribí <span class="t-cmd">help</span>.`)];
    if (result.length) this.print(result);
    sound.blip(true, 0.05);
  }
}
