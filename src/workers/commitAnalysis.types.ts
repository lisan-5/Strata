import type { CommitSummary } from '../lib/github/commits'
import type { CommitFileChange } from '../lib/github/fileChurn'

export interface BasicCommitStats {
  totalCommits: number
  uniqueAuthors: number
  firstCommitDate: string | null
  lastCommitDate: string | null
  commitsPerAuthor: { author: string; count: number }[]
}

export type BusFactorRisk = 'single-owner' | 'concentrated' | 'distributed'

export interface FileChurnRecord {
  path: string
  additions: number
  deletions: number
  churn: number
  touches: number
  authorCount: number
  risk: BusFactorRisk
}

export interface FileCommit {
  sha: string
  files: CommitFileChange[]
}

/**
 * Extensible job protocol: file-churn, commit-message culture, and era
 * detection each add a request/response variant here rather than spinning
 * up their own worker — one worker, dispatched by job type.
 */
export type WorkerRequest =
  | { type: 'basic-stats'; commits: CommitSummary[] }
  | { type: 'file-churn'; commits: CommitSummary[]; fileCommits: FileCommit[] }

export type WorkerResponse =
  | { type: 'basic-stats'; result: BasicCommitStats }
  | { type: 'file-churn'; result: FileChurnRecord[] }
