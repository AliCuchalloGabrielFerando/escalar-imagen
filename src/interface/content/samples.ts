export interface Sample {
  id: string
  label: string
  src: string
}

export const SAMPLES: Sample[] = [
  { id: 'sample-1', label: 'Ejemplo 1', src: '/samples/sample-1.jpg' },
  { id: 'sample-2', label: 'Ejemplo 2', src: '/samples/sample-2.jpg' },
  { id: 'sample-3', label: 'Ejemplo 3', src: '/samples/sample-3.jpg' },
]
