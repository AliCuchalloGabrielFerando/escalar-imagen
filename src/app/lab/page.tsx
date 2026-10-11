import type { Metadata } from 'next'
import { LabBench } from '@/interface/lab/lab-bench'

export const metadata: Metadata = {
  title: 'Laboratorio · WebGPU vs WASM',
  description:
    'Compara el rendimiento de WebGPU y WASM con Real-ESRGAN directamente en tu navegador.',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <LabBench />
}
