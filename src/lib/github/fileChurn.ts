import { githubFetchRaw } from './client'
import { GithubApiError, RateLimitExceededError } from './errors'
import type { RepoRef } from './parseRepoUrl'

export interface CommitFileChange {
  filename: string
  additions: number
  deletions: number
}

export interface CommitFiles {
  sha: string
  files: CommitFileChange[]
}

export interface FetchCommitFilesOptions {
  signal?: AbortSignal
  onProgress?: (done: number, total: number) => void
}

interface RawCommitDetail {
  files?: { filename: string; additions: number; deletions: number }[]
}

const CONCURRENCY = 5

/**
 * Per-commit file diffs cost one request EACH — GitHub's list endpoint
 * doesn't include them, unlike the stats endpoints. Callers must pass an
 * explicit, already-sized sample (e.g. the most recent N commits) rather
 * than the full history, and the UI must disclose that cost before calling
 * this, not just eat the requests silently.
 */
export async function fetchCommitFiles(
  repo: RepoRef,
  shas: string[],
  options: FetchCommitFilesOptions = {},
): Promise<CommitFiles[]> {
  const results: CommitFiles[] = new Array(shas.length)
  let completed = 0

  for (let start = 0; start < shas.length; start += CONCURRENCY) {
    const batch = shas.slice(start, start + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (sha): Promise<CommitFiles> => {
        const response = await githubFetchRaw(
          `/repos/${repo.owner}/${repo.repo}/commits/${sha}`,
          { signal: options.signal },
        )

        if (response.status === 403 || response.status === 429) {
          if (response.headers.get('x-ratelimit-remaining') === '0') {
            const reset = response.headers.get('x-ratelimit-reset')
            throw new RateLimitExceededError(reset ? Number(reset) : null)
          }
        }
        if (!response.ok) {
          throw new GithubApiError(
            `Failed to fetch commit ${sha}: ${response.status}`,
            response.status,
          )
        }

        const detail = (await response.json()) as RawCommitDetail
        completed += 1
        options.onProgress?.(completed, shas.length)

        return {
          sha,
          files: (detail.files ?? []).map((f) => ({
            filename: f.filename,
            additions: f.additions,
            deletions: f.deletions,
          })),
        }
      }),
    )

    batchResults.forEach((result, offset) => {
      results[start + offset] = result
    })
  }

  return results
}
