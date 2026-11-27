/**
 * TUS PROYECTOS
 * ----------------------------------------------------------------------------
 * Agregá un objeto por proyecto. Lo único obligatorio es `id`, `title` y `url`.
 *
 *  id          identificador corto (sin espacios). Se usa para la captura:
 *              public/assets/projects/<id>.jpg
 *  title       nombre que se muestra
 *  description una o dos líneas, en inglés y español: { en: '...', es: '...' }
 *  url         link a la página o app (se abre dentro del portafolio).
 *              Si lo dejás vacío (''), la tarjeta muestra la ficha del proyecto
 *              y el botón abre el código en GitHub (`repo`).
 *  repo        link al código en GitHub (opcional)
 *  tags        tecnologías o etiquetas (opcional)
 *  year        año (opcional)
 *  accent      color de acento de la tarjeta (opcional)
 *
 * Para generar/actualizar las capturas de la página de inicio:
 *     npm run shots
 * (usa el Edge o Chrome que ya tenés instalado; no descarga nada)
 *
 * Si un proyecto no tiene captura, la tarjeta muestra la página en vivo.
 */
export const projects = [
  {
    id: 'clawsbby',
    title: 'Claws bby',
    description: {
      en: 'Website for a nail studio, with an animated intro and a neon sign.',
      es: 'Sitio para un estudio de manicuría, con intro animada y cartel de neón.',
    },
    url: 'https://clawsbby.vercel.app',
    tags: ['Web', 'Landing', 'Vercel'],
    year: '2026',
    accent: '#ff5fae',
  },
  {
    id: 'perfumeria-cr',
    title: 'CR Perfumería & Limpieza',
    description: {
      en: 'Online store with 1000+ products, in-store prices and stock, and pick-up orders.',
      es: 'Tienda online con más de 1000 productos, precios y stock del local, y pedidos para retirar.',
    },
    url: 'https://perfumeria-cr.vercel.app',
    tags: ['E-commerce', 'Online store', 'Vercel'],
    year: '2026',
    accent: '#e2b857',
  },
  {
    id: 'gestion-cr',
    title: 'CR Gestión',
    description: {
      en: 'Sales and inventory app for the shop: scans barcodes, tracks stock and prices, and logs every sale. Installable as a PWA.',
      es: 'App de ventas y stock del local: escanea códigos de barras, controla stock y precios y registra cada venta. Se instala como PWA.',
    },
    url: '', // demo anterior: https://gestion-limpieza-taupe.vercel.app (hoy da 404). Cuando vuelva a estar online, ponela acá.
    repo: 'https://github.com/DylanAndrada13/GestionLimpieza',
    tags: ['PWA', 'Supabase', 'Serverless', 'Barcode'],
    year: '2026',
    accent: '#f0a03c',
  },
  {
    id: 'nexus-ff',
    title: 'Nexus FF',
    description: {
      en: 'Platform for Free Fire tournaments in Argentina: dates, formats, slots and prizes, with an admin panel to confirm teams.',
      es: 'Plataforma de torneos de Free Fire en Argentina: fechas, formatos, cupos y premios, con panel de admin para confirmar equipos.',
    },
    url: '', // demo anterior: https://nexus-sooty-two-70.vercel.app (hoy da 404). Cuando vuelva a estar online, ponela acá.
    repo: 'https://github.com/DylanAndrada13/Nexus',
    tags: ['Next.js', 'TypeScript', 'Prisma'],
    year: '2026',
    accent: '#ff4d4d',
  },
  {
    id: 'biblioteca-eestn5',
    title: 'Biblioteca EESTN5',
    description: {
      en: 'Admin panel for a school library: users, book catalog and stock, loans, requests and activity notifications.',
      es: 'Panel de administración para la biblioteca de la escuela: usuarios, catálogo y stock de libros, préstamos, pedidos y notificaciones.',
    },
    url: '', // demo anterior: https://gestion-biblioteca-eestn5-web-ten.vercel.app (hoy da 404). Cuando vuelva a estar online, ponela acá.
    repo: 'https://github.com/DylanAndrada13/gestion-biblioteca-eestn5-web',
    tags: ['Node.js', 'Express', 'MySQL', 'JWT'],
    year: '2026',
    accent: '#5fd0a0',
  },
];
