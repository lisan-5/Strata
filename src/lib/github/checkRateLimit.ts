import { githubFetch } from './client'

interface RateLimitResponse {
  resources: {
    core: { limit: number; remaining: number; reset: number }
  }
}

/** Hits /rate_limit, which is free and updates the shared rate-limit store as a side effect. */
export async function checkRateLimit() {
  const data = await githubFetch<RateLimitResponse>('/rate_limit')
  return data.resources.core
}
