/**
 * LAYER: Interface
 * Contains: useUpscaleImage hook
 * Rules: Presentation state. Depends on Application/Composition only.
 */
'use client'

import { useCallback, useRef, useState } from 'react'
import type { ImageCodec } from '@/application/ports/image-codec.port'
import type { UpscaleImageUseCase } from '@/application/use-cases/upscale-image.use-case'
import {
  createImageCodec,
  createUpscaleImageUseCase,
  DEFAULT_MODEL_URL,
} from '@/composition/container'
import type { UpscaleOptionsProps } from '@/composition/container'

export type UpscaleStatus = 'idle' | 'decoding' | 'upscaling' | 'encoding' | 'done' | 'error'

export interface UpscaleState {
  status: UpscaleStatus
  progress: number
  message: string
  error: string | null
  resultUrl: string | null
  resultWidth: number
  resultHeight: number
  durationMs: number | null
}

const initialState: UpscaleState = {
  status: 'idle',
  progress: 0,
  message: '',
  error: null,
  resultUrl: null,
  resultWidth: 0,
  resultHeight: 0,
  durationMs: null,
}

export function useUpscaleImage() {
  const codecRef = useRef<ImageCodec | null>(null)
  const useCasesRef = useRef(new Map<string, UpscaleImageUseCase>())
  const resultUrlRef = useRef<string | null>(null)
  const [state, setState] = useState<UpscaleState>(initialState)

  const getCodec = useCallback((): ImageCodec => {
    codecRef.current ??= createImageCodec()
    return codecRef.current
  }, [])

  const getUseCase = useCallback((modelUrl: string): UpscaleImageUseCase => {
    const cached = useCasesRef.current.get(modelUrl)
    if (cached) return cached
    const useCase = createUpscaleImageUseCase(modelUrl)
    useCasesRef.current.set(modelUrl, useCase)
    return useCase
  }, [])

  const releaseResultUrl = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
  }, [])

  const upscale = useCallback(
    async (input: Blob, modelUrl: string = DEFAULT_MODEL_URL, options?: UpscaleOptionsProps) => {
      releaseResultUrl()
      setState({ ...initialState, status: 'decoding', message: 'Decodificando imagen…' })

      try {
        const codec = getCodec()
        const image = await codec.decode(input)

        setState((prev) => ({
          ...prev,
          status: 'upscaling',
          message: 'Cargando modelo y escalando…',
        }))

        const { image: result, durationMs } = await getUseCase(modelUrl).execute({
          image,
          options,
          onProgress: (progress) =>
            setState((prev) => ({ ...prev, progress: progress.ratio, message: progress.message })),
        })

        setState((prev) => ({ ...prev, status: 'encoding', progress: 1, message: 'Codificando resultado…' }))
        const blob = await codec.encode(result)
        const url = URL.createObjectURL(blob)
        resultUrlRef.current = url

        setState({
          status: 'done',
          progress: 1,
          message: 'Listo',
          error: null,
          resultUrl: url,
          resultWidth: result.width,
          resultHeight: result.height,
          durationMs,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setState((prev) => ({ ...prev, status: 'error', error: message, message: '' }))
      }
    },
    [getCodec, getUseCase, releaseResultUrl],
  )

  const reset = useCallback(() => {
    releaseResultUrl()
    setState(initialState)
  }, [releaseResultUrl])

  return { ...state, upscale, reset }
}
