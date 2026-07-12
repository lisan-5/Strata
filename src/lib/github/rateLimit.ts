export interface RateLimitState {
  limit: number
  remaining: number
  /** Epoch seconds when the current window resets, or null if unknown. */
  resetAt: number | null
}

let state: RateLimitState = {
  limit: 60,
  remaining: 60,
  resetAt: null,
}

const listeners = new Set<() => void>()

export function getRateLimitState(): RateLimitState {
  return state
}

export function subscribeRateLimit(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updateRateLimitFromHeaders(headers: Headers): void {
  const limit = headers.get('x-ratelimit-limit')
  const remaining = headers.get('x-ratelimit-remaining')
  const reset = headers.get('x-ratelimit-reset')

  if (limit === null || remaining === null) return

  state = {
    limit: Number(limit),
    remaining: Number(remaining),
    resetAt: reset ? Number(reset) : null,
  }
  listeners.forEach((listener) => listener())
}
