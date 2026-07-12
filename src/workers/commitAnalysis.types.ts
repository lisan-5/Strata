import type { CommitSummary } from '../lib/github/commits'

export interface BasicCommitStats {
  totalCommits: number
  uniqueAuthors: number
  firstCommitDate: string | null
  lastCommitDate: string | null
  commitsPerAuthor: { author: string; count: number }[]
}

/**
 * Extensible job protocol: file-churn, commit-message culture, and era
 * detection each add a request/response variant here rather than spinning
 * up their own worker — one worker, dispatched by job type.
 */
export type WorkerRequest = { type: 'basic-stats'; commits: CommitSummary[] }

export type WorkerResponse = { type: 'basic-stats'; result: BasicCommitStats }
