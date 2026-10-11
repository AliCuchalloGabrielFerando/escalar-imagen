/**
 * LAYER: Interface
 * Contains: useUpscaleImage hook
 * Rules: Presentation state. Depends on Application/Composition only.
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EncodeOptions, FormatCapability, ImageCodec, OutputFormat } from '@/composition/container'
import { OUTPUT_FORMATS } from '@/composition/container'
import type { UpscaleImageUseCase } from '@/application/use-cases/upscale-image.use-case'
import {
  createImageCodec,
  createUpscaleImageUseCase,
  DEFAULT_MODEL_URL,
} from '@/composition/container'
import type { RgbaImage, UpscaleOptionsProps } from '@/composition/container'

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
  /** Output format of the current result. */
  resultFormat: OutputFormat | null
  /** File extension for the download. */
  resultExtension: string | null
  /** Encoded size in bytes. */
  resultBytes: number | null
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
  resultFormat: null,
  resultExtension: null,
  resultBytes: null,
}

/** Optimistic default before the browser capability probe resolves. */
const optimisticCapabilities: FormatCapability[] = OUTPUT_FORMATS.map((format) => ({
  ...format,
  encodable: true,
}))

export function useUpscaleImage() {
  const codecRef = useRef<ImageCodec | null>(null)
  const useCasesRef = useRef(new Map<string, UpscaleImageUseCase>())
  const resultUrlRef = useRef<string | null>(null)
  const resultImageRef = useRef<RgbaImage | null>(null)
  const [state, setState] = useState<UpscaleState>(initialState)
  const [capabilities, setCapabilities] = useState<FormatCapability[]>(optimisticCapabilities)

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

  useEffect(() => {
    let cancelled = false
    getCodec()
      .getCapabilities()
      .then((caps) => {
        if (!cancelled) setCapabilities(caps)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [getCodec])

  const releaseResultUrl = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
  }, [])

  /** Encode `image` to a blob, swap the object URL and return the new metadata. */
  const encodeResult = useCallback(
    async (image: RgbaImage, output: EncodeOptions) => {
      const blob = await getCodec().encode(image, output)
      const meta = OUTPUT_FORMATS.find((format) => format.format === output.format)
      if (!meta) throw new Error(`Formato de salida desconocido: ${output.format}`)
      releaseResultUrl()
      const url = URL.createObjectURL(blob)
      resultUrlRef.current = url
      return { url, extension: meta.extension, bytes: blob.size }
    },
    [getCodec, releaseResultUrl],
  )

  const upscale = useCallback(
    async (
      input: Blob,
      modelUrl: string = DEFAULT_MODEL_URL,
      options?: UpscaleOptionsProps,
      output: EncodeOptions = { format: 'png' },
    ) => {
      releaseResultUrl()
      resultImageRef.current = null
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

        resultImageRef.current = result

        setState((prev) => ({ ...prev, status: 'encoding', progress: 1, message: 'Codificando resultado…' }))
        const { url, extension, bytes } = await encodeResult(result, output)

        setState((prev) => ({
          ...prev,
          status: 'done',
          progress: 1,
          message: 'Listo',
          error: null,
          resultUrl: url,
          resultWidth: result.width,
          resultHeight: result.height,
          durationMs,
          resultFormat: output.format,
          resultExtension: extension,
          resultBytes: bytes,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setState((prev) => ({ ...prev, status: 'error', error: message, message: '' }))
      }
    },
    [encodeResult, getCodec, getUseCase, releaseResultUrl],
  )

  /** Re-encode the existing result without re-running inference. */
  const reencode = useCallback(
    async (output: EncodeOptions) => {
      const image = resultImageRef.current
      if (!image) return
      setState((prev) => ({ ...prev, status: 'encoding', message: 'Recodificando…', error: null }))
      try {
        const { url, extension, bytes } = await encodeResult(image, output)
        setState((prev) => ({
          ...prev,
          status: 'done',
          message: 'Listo',
          resultUrl: url,
          resultFormat: output.format,
          resultExtension: extension,
          resultBytes: bytes,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setState((prev) => ({ ...prev, status: 'error', error: message, message: '' }))
      }
    },
    [encodeResult],
  )

  const reset = useCallback(() => {
    releaseResultUrl()
    resultImageRef.current = null
    setState(initialState)
  }, [releaseResultUrl])

  return { ...state, capabilities, upscale, reencode, reset }
}
