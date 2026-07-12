import { githubFetchRaw } from './client'
import { GithubApiError, RateLimitExceededError } from './errors'
import { parseLinkHeader } from './parseLinkHeader'
import type { RepoRef } from './parseRepoUrl'

export interface CommitSummary {
  sha: string
  message: string
  authorLogin: string | null
  authorName: string
  authorDate: string
}

interface RawCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string } | null
  }
  author: { login: string } | null
}

export interface FetchCommitsResult {
  commits: CommitSummary[]
  /** True if we stopped before reaching the end of history because of maxCommits. */
  truncated: boolean
  /** Rough estimate of total commit count, derived from GitHub's last-page Link header. */
  estimatedTotal: number | null
}

export interface FetchCommitsOptions {
  signal?: AbortSignal
  maxCommits?: number
  onPage?: (fetched: number, estimatedTotal: number | null) => void
}

const PER_PAGE = 100
const DEFAULT_MAX_COMMITS = 2000

function toSummary(raw: RawCommit): CommitSummary {
  return {
    sha: raw.sha,
    message: raw.commit.message,
    authorLogin: raw.author?.login ?? null,
    authorName: raw.commit.author?.name ?? 'unknown',
    authorDate: raw.commit.author?.date ?? '',
  }
}

function estimateTotalFromLastLink(linkHeader: string | null): number | null {
  const links = parseLinkHeader(linkHeader)
  if (!links.last) return null
  const page = Number(new URL(links.last).searchParams.get('page'))
  return Number.isFinite(page) ? page * PER_PAGE : null
}

/**
 * Lists commits newest-first, paginating via the Link header. Capped at
 * maxCommits by default (2000 ≈ 20 requests) so one repo can't silently burn
 * an entire rate-limit budget — callers get `truncated` back and should
 * surface that as an honesty badge rather than presenting partial history
 * as complete.
 */
export async function fetchCommits(
  repo: RepoRef,
  options: FetchCommitsOptions = {},
): Promise<FetchCommitsResult> {
  const maxCommits = options.maxCommits ?? DEFAULT_MAX_COMMITS
  const commits: CommitSummary[] = []
  let estimatedTotal: number | null = null
  let page = 1
  let truncated = false

  while (commits.length < maxCommits) {
    const response = await githubFetchRaw(
      `/repos/${repo.owner}/${repo.repo}/commits?per_page=${PER_PAGE}&page=${page}`,
      { signal: options.signal },
    )

    if (response.status === 403 || response.status === 429) {
      if (response.headers.get('x-ratelimit-remaining') === '0') {
        const reset = response.headers.get('x-ratelimit-reset')
        throw new RateLimitExceededError(reset ? Number(reset) : null)
      }
    }
    if (response.status === 409) break // Empty repository — no commits yet.
    if (!response.ok) {
      throw new GithubApiError(`Failed to list commits: ${response.status}`, response.status)
    }

    if (page === 1) {
      estimatedTotal = estimateTotalFromLastLink(response.headers.get('link'))
    }

    const batch = (await response.json()) as RawCommit[]
    commits.push(...batch.map(toSummary))
    options.onPage?.(commits.length, estimatedTotal)

    const links = parseLinkHeader(response.headers.get('link'))
    if (!links.next || batch.length === 0) break

    if (commits.length >= maxCommits) {
      truncated = true
      break
    }

    page += 1
  }

  return { commits: commits.slice(0, maxCommits), truncated, estimatedTotal }
}
