/**
 * TUS DATOS
 * ----------------------------------------------------------------------------
 * Todo lo que aparece en "sobre mí" (el cuadro) y "contacto" (la ventana).
 * Los textos van en inglés (en) y español (es): el sitio arranca en inglés.
 * Si dejás un link vacío (''), ese botón no se muestra.
 */
export const profile = {
  name: 'Dylan Andrada',
  role: 'marketing × dev',

  about: {
    en: [
      'I’m Dylan, from Lanús, Buenos Aires. I work right where marketing meets code: I figure out how a business gets its customers, and then I build the machinery that makes it happen.',
      'Sometimes that’s a store that turns visits into orders. Sometimes it’s a system that replaces the spreadsheet and the notebook: stock, barcodes, sales, reports. And sometimes it’s an automation that answers, loads and notifies while you sleep. Less manual work, more numbers that add up.',
    ],
    es: [
      'Soy Dylan, de Lanús, Buenos Aires. Me muevo justo donde el marketing se cruza con el código: entiendo cómo un negocio consigue clientes y después armo la maquinaria para que pase.',
      'A veces es una tienda que convierte visitas en pedidos. A veces, un sistema que reemplaza la planilla y el cuaderno: stock, códigos de barra, ventas, reportes. Y a veces, una automatización que responde, carga y avisa mientras dormís. Menos trabajo a mano, más números que cierran.',
    ],
  },

  // estante de skills: name + icon (sigla de 1 a 3 letras) + color
  skills: [
    { name: 'JavaScript', icon: 'JS', color: '#f7df1e' },
    { name: 'TypeScript', icon: 'TS', color: '#3178c6' },
    { name: 'HTML', icon: '</>', color: '#e44d26' },
    { name: 'CSS', icon: '{}', color: '#2965f1' },
    { name: 'Next.js', icon: 'N', color: '#ffffff' },
    { name: 'Node.js', icon: 'nd', color: '#5fa04e' },
    { name: 'Express', icon: 'ex', color: '#c8c8c8' },
    { name: 'Vite', icon: 'V', color: '#a855f7' },
    { name: 'Three.js', icon: '3D', color: '#46dcff' },
    { name: 'GSAP', icon: 'gs', color: '#88ce02' },
    { name: 'Supabase', icon: 'sb', color: '#3ecf8e' },
    { name: 'MySQL', icon: 'my', color: '#4fb3d9' },
    { name: 'Prisma', icon: 'pr', color: '#8f9cff' },
    { name: 'PWA', icon: 'pwa', color: '#ff5fae' },
    { name: 'Vercel', icon: '▲', color: '#ffffff' },
  ],

  // datos rápidos (etiqueta → valor)
  facts: [
    [{ en: 'location', es: 'ubicación' }, 'Lanús, Buenos Aires'],
    [{ en: 'status', es: 'estado' }, { en: 'open to projects', es: 'disponible para proyectos' }],
    [{ en: 'focus', es: 'enfoque' }, { en: 'marketing × code', es: 'marketing × código' }],
    [{ en: 'I build', es: 'armo' }, { en: 'stores · systems · automations', es: 'tiendas · sistemas · automatizaciones' }],
  ],

  // CV para descargar: poné el PDF en public/cv/ con este nombre.
  // Si el archivo no existe, el botón no aparece.
  cv: '/cv/Dylan-Andrada-CV.pdf',

  contact: {
    email: 'dylanandradadev@gmail.com',
    github: 'https://github.com/DylanAndrada13',
    linkedin: '', // ej: 'https://www.linkedin.com/in/tuusuario'
    instagram: 'https://instagram.com/dylan.developer',
    whatsapp: '', // ej: 'https://wa.me/5491100000000'
  },

  // Formulario de contacto. Creá un formulario gratis en https://formspree.io,
  // y pegá acá la URL que te dan (ej: 'https://formspree.io/f/abcdwxyz').
  // Sin URL, el formulario abre la app de correo con el mensaje armado (si hay email).
  // Sin URL ni email, el formulario no se muestra.
  formEndpoint: '',
};
