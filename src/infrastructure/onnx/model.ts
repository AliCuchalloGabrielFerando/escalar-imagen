/**
 * LAYER: Infrastructure
 * Contains: ONNX model configuration
 * Rules: Technical/library configuration. Not domain logic.
 */

/** Public path of the model. Drop the file in `public/models/`. */
export const DEFAULT_MODEL_URL = '/models/realesr-general-x4v3.onnx'

/** realesr-general-x4v3 is a fixed 4x super-resolution model. */
export const MODEL_SCALE = 4

/**
 * Symbolic (dynamic) dimension names declared by the default model's input
 * `[batch_size, 3, height, width]`. They are required to pin the shapes via
 * `freeDimensionOverrides` on the WebGPU EP, which otherwise fails with
 * "Shape mismatch attempting to re-use buffer" (the allocator reuses a buffer
 * for the 4x-larger output). Only meaningful for the default model.
 */
export const MODEL_DYNAMIC_DIMS = {
  batch: 'batch_size',
  height: 'height',
  width: 'width',
} as const

/**
 * Where onnxruntime-web loads its `.wasm` binaries from.
 * Pinned to the installed version to avoid mismatches.
 * Set to `undefined` to let the bundler resolve them instead.
 */
export const ONNXRUNTIME_WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/'
