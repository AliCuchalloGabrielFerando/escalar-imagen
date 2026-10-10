'use client'

import { useEffect } from 'react'

/**
 * LAYER: Interface
 * Contains: DevCleanup (development-only safety net)
 * Rules: No-op in production. Clears stale Service Workers / caches that a
 *        previous project may have left registered on localhost, which can
 *        serve old assets and break styles or hydration during development.
 */
export function DevCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (typeof navigator === 'undefined') return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) void registration.unregister()
        })
        .catch(() => {})
    }

    if (typeof caches !== 'undefined') {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {})
    }
  }, [])

  return null
}
