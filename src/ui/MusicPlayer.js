import { TRACKS } from '../data/music.js';
import { t, i18n } from '../i18n/i18n.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let apiPromise = null;
/** Carga la API del reproductor de YouTube una sola vez (recién cuando se abre el menú). */
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('youtube'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

/**
 * Menú del parlante: elegís una de las 3 canciones y suena con el reproductor de YouTube
 * (oculto). Sigue sonando aunque cierres el menú.
 */
export class MusicPlayer {
  constructor({ anchor, onState }) {
    this.anchor = anchor; // el parlante (para ubicar el menú al lado)
    this.onState = onState;
    this.current = -1;
    this.playing = false;
    this.titles = TRACKS.map((tr) => tr.title);
    this.artists = TRACKS.map((tr) => tr.artist);

    this.el = document.createElement('div');
    this.el.className = 'music';
    this.el.setAttribute('role', 'dialog');
    this.el.hidden = true;
    document.body.appendChild(this.el);

    this.host = document.createElement('div');
    this.host.className = 'music__yt';
    this.host.setAttribute('aria-hidden', 'true');
    this.host.innerHTML = '<div id="music-yt"></div>';
    document.body.appendChild(this.host);

    this.onDocDown = (e) => {
      if (!this.el.contains(e.target) && !this.anchor.contains(e.target)) this.close();
    };
    this.onKey = (e) => e.key === 'Escape' && this.close();
    this.render();
    i18n.onChange(() => this.render());
    this.fetchTitles();
  }

  /** Títulos de las canciones (oEmbed público de YouTube; si falla queda "Canción N"). */
  fetchTitles() {
    TRACKS.forEach((tr, i) => {
      if (this.titles[i]) return;
      fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${tr.id}`)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          this.titles[i] = d.title;
          this.artists[i] = this.artists[i] || d.author_name;
          this.render();
        })
        .catch(() => {});
    });
  }

  render() {
    const rows = TRACKS.map((tr, i) => {
      const on = i === this.current;
      const state = on ? (this.playing ? 'is-playing' : 'is-paused') : '';
      return `<li><button type="button" class="music__track ${state}" data-i="${i}" aria-pressed="${on && this.playing}">
          <span class="music__thumb" style="background-image:url(https://i.ytimg.com/vi/${esc(tr.id)}/mqdefault.jpg)">
            <span class="music__eq" aria-hidden="true"><i></i><i></i><i></i></span>
          </span>
          <span class="music__meta">
            <span class="music__title">${esc(this.titles[i] || `${t('music.track')} ${i + 1}`)}</span>
            <span class="music__artist">${esc(this.artists[i] || 'YouTube')}</span>
          </span>
          <span class="music__icon" aria-hidden="true">${on && this.playing ? '❚❚' : '▶'}</span>
        </button></li>`;
    }).join('');
    this.el.setAttribute('aria-label', t('music.title'));
    this.el.innerHTML = `
      <div class="music__head">
        <span class="music__label">${esc(t('music.title'))}</span>
        <button type="button" class="music__close" aria-label="${esc(t('close'))}">✕</button>
      </div>
      <ol class="music__list">${rows}</ol>
      <div class="music__foot">
        <button type="button" class="music__stop" ${this.current < 0 ? 'disabled' : ''}>■ ${esc(t('music.stop'))}</button>
        <label class="music__vol"><span>${esc(t('music.volume'))}</span>
          <input type="range" min="0" max="100" value="${this.volume ?? 60}" aria-label="${esc(t('music.volume'))}">
        </label>
      </div>
      ${this.error ? `<p class="music__error">${esc(t('music.error'))}</p>` : ''}`;
    this.el.querySelectorAll('.music__track').forEach((b) => b.addEventListener('click', () => this.pick(Number(b.dataset.i))));
    this.el.querySelector('.music__close').addEventListener('click', () => this.close());
    this.el.querySelector('.music__stop').addEventListener('click', () => this.stop());
    this.el.querySelector('input').addEventListener('input', (e) => {
      this.volume = Number(e.target.value);
      this.player?.setVolume?.(this.volume);
    });
  }

  get isOpen() {
    return !this.el.hidden;
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.el.hidden = false;
    this.place();
    requestAnimationFrame(() => this.el.classList.add('is-open'));
    document.addEventListener('pointerdown', this.onDocDown, true);
    document.addEventListener('keydown', this.onKey);
    this.el.querySelector('.music__track')?.focus({ preventScroll: true });
    loadYouTube().catch(() => {
      this.error = true;
      this.render();
    });
  }

  close() {
    if (!this.isOpen) return;
    this.el.classList.remove('is-open');
    this.el.hidden = true;
    document.removeEventListener('pointerdown', this.onDocDown, true);
    document.removeEventListener('keydown', this.onKey);
  }

  /** Abre el menú arriba del parlante (en celu queda como hoja abajo, por CSS). */
  place() {
    const r = this.anchor.getBoundingClientRect();
    const w = 300;
    const x = Math.min(window.innerWidth - w - 12, Math.max(12, r.left + r.width / 2 - w / 2));
    this.el.style.setProperty('--x', `${x}px`);
    this.el.style.setProperty('--y', `${Math.max(12, window.innerHeight - r.top + 10)}px`);
  }

  async pick(i) {
    if (i === this.current && this.player) {
      this.playing ? this.player.pauseVideo() : this.player.playVideo();
      return;
    }
    this.current = i;
    this.playing = true; // optimista: el ícono cambia al toque
    this.render();
    try {
      const YT = await loadYouTube();
      if (!this.player) {
        this.player = new YT.Player('music-yt', {
          width: 200,
          height: 200,
          videoId: TRACKS[i].id,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0 },
          events: {
            onReady: (e) => {
              e.target.setVolume(this.volume ?? 60);
              e.target.playVideo();
            },
            onStateChange: (e) => this.sync(e.data),
            onError: () => {
              this.error = true;
              this.playing = false;
              this.render();
              this.onState?.(false);
            },
          },
        });
      } else {
        this.player.loadVideoById(TRACKS[i].id);
      }
    } catch {
      this.error = true;
      this.playing = false;
      this.render();
    }
    this.onState?.(this.playing);
  }

  sync(code) {
    const YT = window.YT;
    if (code === YT.PlayerState.PLAYING) {
      this.playing = true;
      this.error = false;
      const d = this.player.getVideoData?.();
      if (d?.title && !this.titles[this.current]) {
        this.titles[this.current] = d.title;
        this.artists[this.current] = this.artists[this.current] || d.author;
      }
    } else if (code === YT.PlayerState.PAUSED) {
      this.playing = false;
    } else if (code === YT.PlayerState.ENDED) {
      // pasa a la siguiente
      this.pick((this.current + 1) % TRACKS.length);
      return;
    }
    this.render();
    this.onState?.(this.playing);
  }

  stop() {
    this.player?.stopVideo?.();
    this.current = -1;
    this.playing = false;
    this.render();
    this.onState?.(false);
  }
}
