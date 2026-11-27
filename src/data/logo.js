/**
 * Tu logo: la D hexagonal roja.
 *  - LOGO_VIEWBOX / LOGO_SVG: el dibujo (sin la etiqueta <svg>), para usarlo en cualquier lado.
 *  - En el monitor grande de la habitación se "arma" solo: primero las líneas, después la cara roja.
 * El archivo suelto está en public/brand/logo-d.svg.
 */
export const LOGO_VIEWBOX = '-20 -20 460 560';
export const LOGO_SVG = `
<defs>
    <linearGradient id="dl-facet" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#ff1a3c"/>
      <stop offset="1" stop-color="#5e0010"/>
    </linearGradient>
    <linearGradient id="dl-fade" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#ff1f42"/>
      <stop offset="0.7" stop-color="#ff1f42"/>
      <stop offset="1" stop-color="#6a3a42"/>
    </linearGradient>
    <filter id="dl-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#dl-glow)" fill="none" stroke-width="5" stroke-linejoin="miter" stroke-linecap="square">
    <path class="dl-line dl-1" pathLength="1" stroke="url(#dl-fade)" d="M15 105 L178 13 L406 148 L406 346 L129 504 L129 435"/>
    <path class="dl-line dl-2" pathLength="1" stroke="url(#dl-fade)" d="M15 105 L121 152 L121 345 L15 406 Z"/>
    <path class="dl-line dl-3" pathLength="1" stroke="#ff1f42" d="M127 348 L127 152 L302 247 L302 328"/>
    <path class="dl-facet" fill="url(#dl-facet)" stroke="none" d="M127 348 L302 247 L302 328 L129 435 Z"/>
  </g>
`;
