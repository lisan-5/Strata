import { getToken } from './token'
import { updateRateLimitFromHeaders } from './rateLimit'
import { GithubApiError, NotFoundError, RateLimitExceededError } from './errors'

const API_BASE = 'https://api.github.com'

export interface GithubRequestOptions {
  signal?: AbortSignal
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** Low-level fetch against the GitHub API. Tracks rate-limit headers on every call. */
export async function githubFetchRaw(
  path: string,
  options: GithubRequestOptions = {},
): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(),
    signal: options.signal,
  })
  updateRateLimitFromHeaders(response.headers)
  return response
}

/** Fetch and parse JSON, throwing typed errors for 404 and exhausted-rate-limit responses. */
export async function githubFetch<T>(
  path: string,
  options: GithubRequestOptions = {},
): Promise<T> {
  const response = await githubFetchRaw(path, options)

  if (response.status === 403 || response.status === 429) {
    if (response.headers.get('x-ratelimit-remaining') === '0') {
      const reset = response.headers.get('x-ratelimit-reset')
      throw new RateLimitExceededError(reset ? Number(reset) : null)
    }
  }

  if (response.status === 404) {
    throw new NotFoundError()
  }

  if (!response.ok) {
    throw new GithubApiError(`GitHub API error: ${response.status}`, response.status)
  }

  return response.json() as Promise<T>
}
