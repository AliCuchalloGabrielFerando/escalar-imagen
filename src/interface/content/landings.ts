export interface FaqItem {
  q: string
  a: string
}

export interface RelatedLink {
  label: string
  href: string
}

export interface Landing {
  key: string
  path: string
  title: string
  description: string
  h1: string
  intro: string[]
  faq: FaqItem[]
  related: RelatedLink[]
}

/**
 * Registry of SEO landings. Single source of truth:
 * key -> path -> copy/FAQ/related. All landings reuse the same ToolSection.
 */
export const LANDINGS: Record<string, Landing> = {
  'escalar-imagen-4x': {
    key: 'escalar-imagen-4x',
    path: '/demo',
    title: 'Escalar imagen 4x online y gratis',
    description:
      'Aumenta la resolución de tus imágenes 4x con IA directamente en el navegador. Sin subir archivos a ningún servidor.',
    h1: 'Escalar imagen 4x online',
    intro: [
      'Escalar una imagen consiste en aumentar su resolución manteniendo (o recuperando) el detalle. Este demo usa Real-ESRGAN, un modelo de superresolución 4x entrenado para reconstruir texturas en fotografías e ilustraciones reales.',
      'A diferencia de un simple redimensionado, que interpola píxeles y produce bordes borrosos, el modelo predice el detalle que falta. El resultado es una imagen con 4x el ancho y 4x el alto, más nítida y con menos artefactos.',
      'Todo el proceso ocurre en tu navegador: el modelo se ejecuta con ONNX Runtime Web dentro de un Web Worker. No hay subida de archivos, ni esperas en cola, ni cuentas que crear.',
    ],
    faq: [
      {
        q: '¿Cómo escalo una imagen 4x online?',
        a: 'Sube o arrastra una imagen en el recuadro de arriba, pulsa «Escalar 4x» y espera a que termine. Después podrás descargar el resultado en PNG.',
      },
      {
        q: '¿La calidad mejora de verdad?',
        a: 'Sí. El modelo reconstruye detalle en lugar de interpolar. En fotos y capturas notarás bordes más definidos y texturas más limpias, especialmente a partir de imágenes pequeñas.',
      },
      {
        q: '¿Funciona en el móvil?',
        a: 'Funciona en navegadores modernos de escritorio y móvil con soporte de WebAssembly. En dispositivos modestos el proceso puede tardar algo más.',
      },
      {
        q: '¿Necesito instalar algo?',
        a: 'No. Todo funciona con las capacidades nativas del navegador. La primera ejecución descarga el modelo (unos 5 MB) y luego queda en caché.',
      },
      {
        q: '¿Puedo escalar imágenes grandes?',
        a: 'Sí. Las imágenes se dividen en bloques con solape para procesarlas sin agotar la memoria, así que el tamaño no es un problema tan grande como en otros demos.',
      },
    ],
    related: [
      { label: 'Cómo funciona el escalado', href: '/#how' },
      { label: 'Casos de uso', href: '/#use-cases' },
      { label: 'Privacidad y procesamiento local', href: '/#privacy' },
    ],
  },
}
