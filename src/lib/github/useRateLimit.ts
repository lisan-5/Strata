import { useSyncExternalStore } from 'react'
import { getRateLimitState, subscribeRateLimit, type RateLimitState } from './rateLimit'

export function useRateLimit(): RateLimitState {
  return useSyncExternalStore(subscribeRateLimit, getRateLimitState)
}
