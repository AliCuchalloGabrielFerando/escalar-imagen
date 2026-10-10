/**
 * LAYER: Infrastructure
 * Contains: PerformanceClock (Clock implementation)
 * Rules: Implements an Application port using the browser performance API.
 */
import type { Clock } from '@/application/ports/clock.port'

export class PerformanceClock implements Clock {
  now(): number {
    return performance.now()
  }
}
