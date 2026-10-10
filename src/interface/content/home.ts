export const HERO = {
  title: 'Escala tus imágenes 4x',
  subtitle:
    'Aumenta la resolución de fotos y capturas con IA, directamente en tu navegador. Gratis y sin subir nada a un servidor.',
}

export const STEPS = [
  {
    title: 'Sube tu imagen',
    body: 'Arrastra un archivo o elige uno de los ejemplos. Se admiten los formatos de imagen habituales.',
  },
  {
    title: 'Se procesa en tu equipo',
    body: 'El modelo se ejecuta en un Web Worker con WebAssembly. Tu imagen nunca sale del dispositivo.',
  },
  {
    title: 'Reconstrucción 4x',
    body: 'Real-ESRGAN analiza la imagen por bloques (tiles) con solape y reconstruye el detalle multiplicando la resolución por cuatro.',
  },
  {
    title: 'Descarga el resultado',
    body: 'Obtén un PNG con 4x el ancho y alto, listo para guardar o seguir editando.',
  },
]

export const USE_CASES = [
  {
    title: 'Fotos antiguas',
    body: 'Recupera detalle en imágenes de baja resolución o comprimidas.',
    href: '/demo',
  },
  {
    title: 'Capturas de pantalla',
    body: 'Nítidas para presentaciones, documentación o interfaces.',
    href: '/demo',
  },
  {
    title: 'Productos y e-commerce',
    body: 'Mejora fotos de catálogo antes de publicarlas.',
    href: '/demo',
  },
  {
    title: 'Arte e ilustración',
    body: 'Amplía bocetos y artwork sin perder definición.',
    href: '/demo',
  },
]

export const TRUST = {
  title: 'Privacidad por diseño',
  body: 'Todo el escalado ocurre en tu navegador. El modelo de IA se descarga una vez y se ejecuta con WebAssembly dentro de un Web Worker, así que tus imágenes no se envían a ningún servidor ni se almacenan en ninguna parte. Puedes comprobarlo desconectando la red después de cargar la página.',
}

export const HOME_FAQ = [
  {
    q: '¿Es gratis?',
    a: 'Sí. Es una prueba de concepto abierta, sin registro, sin cuentas y sin marcas de agua.',
  },
  {
    q: '¿Se suben mis imágenes a un servidor?',
    a: 'No. La imagen se decodifica y se procesa íntegramente en tu navegador. No hay backend que reciba el archivo.',
  },
  {
    q: '¿Qué formatos admite?',
    a: 'Cualquier formato que tu navegador pueda decodificar: PNG, JPG, WEBP, GIF (primer fotograma), etc. El resultado se descarga como PNG.',
  },
  {
    q: '¿Cuánto tarda?',
    a: 'Depende del tamaño de la imagen y de tu equipo. Una imagen pequeña tarda unas décimas de segundo; las grandes se dividen en bloques y pueden tardar unos segundos.',
  },
  {
    q: '¿Hay un tamaño máximo?',
    a: 'No hay un límite impuesto. Las imágenes grandes se procesan por tiles para no agotar la memoria, así que puedes escalar archivos bastante grandes.',
  },
  {
    q: '¿Qué modelo se usa?',
    a: 'Real-ESRGAN (realesr-general-x4v3), un modelo general de superresolución 4x de unos 5 MB, ejecutado con ONNX Runtime Web.',
  },
]

export const FEATURES = [
  {
    title: '100% en el navegador',
    body: 'El modelo corre con WebAssembly dentro de un Web Worker. Tus imágenes no se suben a ningún servidor.',
  },
  {
    title: '4x real',
    body: 'Multiplica por cuatro el ancho y el alto usando Real-ESRGAN (realesr-general-x4v3).',
  },
  {
    title: 'Tiling inteligente',
    body: 'Procesa la imagen por bloques con solape para manejar archivos grandes sin agotar la memoria.',
  },
  {
    title: 'Sin cuenta ni marcas de agua',
    body: 'Sin registro, sin límites artificiales y sin marcas de agua sobre el resultado.',
  },
  {
    title: 'Pensado para evolucionar',
    body: 'Prueba de concepto lista para medir alternativas como WebGPU u otros modelos de superresolución.',
  },
]
