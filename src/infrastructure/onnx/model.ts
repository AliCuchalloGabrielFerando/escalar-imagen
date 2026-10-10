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
 * Where onnxruntime-web loads its `.wasm` binaries from.
 * Pinned to the installed version to avoid mismatches.
 * Set to `undefined` to let the bundler resolve them instead.
 */
export const ONNXRUNTIME_WASM_CDN =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/'
