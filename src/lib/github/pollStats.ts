import { githubFetchRaw } from './client'
import { GithubApiError, RateLimitExceededError } from './errors'

export interface PollOptions {
  signal?: AbortSignal
  maxAttempts?: number
  onRetry?: (attempt: number, delayMs: number) => void
}

const INITIAL_DELAY_MS = 1500
const MAX_DELAY_MS = 10000

function backoffDelay(attempt: number): number {
  return Math.min(INITIAL_DELAY_MS * 2 ** attempt, MAX_DELAY_MS)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

/**
 * GitHub's stats endpoints (commit_activity, contributors, code_frequency,
 * punch_card) return 202 with an EMPTY body while the stats are computed
 * server-side — that can take 10-30s on a cold cache for a large repo.
 * Every naive client that reads the body of a 202 gets `undefined` and
 * crashes; this polls with exponential backoff until GitHub returns 200.
 */
export async function pollStats<T>(path: string, options: PollOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 8

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await githubFetchRaw(path, { signal: options.signal })

    if (response.status === 202) {
      const delay = backoffDelay(attempt)
      options.onRetry?.(attempt + 1, delay)
      await sleep(delay, options.signal)
      continue
    }

    if (response.status === 403 || response.status === 429) {
      if (response.headers.get('x-ratelimit-remaining') === '0') {
        const reset = response.headers.get('x-ratelimit-reset')
        throw new RateLimitExceededError(reset ? Number(reset) : null)
      }
    }

    if (response.status === 404) {
      // Empty repo, or GitHub gave up computing stats for it — treat as "no data".
      return [] as unknown as T
    }

    if (!response.ok) {
      throw new GithubApiError(`GitHub stats request failed: ${response.status}`, response.status)
    }

    const body = await response.json()
    // GitHub sometimes answers 200 with a bare `{}` instead of the documented
    // array for repos too new/small for stats to have been computed yet — an
    // undocumented cousin of the 202 dance. All four stats endpoints this app
    // calls are array-shaped, so normalize anything else to empty.
    return (Array.isArray(body) ? body : []) as T
  }

  throw new GithubApiError(
    `GitHub stats for ${path} never finished computing after ${maxAttempts} attempts`,
    202,
  )
}
