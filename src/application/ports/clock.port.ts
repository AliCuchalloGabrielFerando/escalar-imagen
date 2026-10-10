/**
 * LAYER: Application
 * Contains: Clock Port
 * Rules: Contract only. Keeps use cases testable/deterministic.
 */
export interface Clock {
  /** Milliseconds, monotonic. */
  now(): number
}
