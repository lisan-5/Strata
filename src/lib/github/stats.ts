import { pollStats, type PollOptions } from './pollStats'
import type { RepoRef } from './parseRepoUrl'

export interface WeeklyCommitActivity {
  /** Commits per day, Sunday through Saturday. */
  days: number[]
  total: number
  /** Epoch seconds, start of week (always a Sunday). */
  week: number
}

export interface ContributorStats {
  author: { login: string; id: number; avatar_url: string } | null
  total: number
  weeks: { w: number; a: number; d: number; c: number }[]
}

/** [week (epoch seconds), additions, deletions] — deletions is negative. */
export type CodeFrequencyPoint = [number, number, number]

/** [day of week (0 = Sunday), hour of day (0-23), commit count]. */
export type PunchCardPoint = [number, number, number]

function statsPath(repo: RepoRef, endpoint: string): string {
  return `/repos/${repo.owner}/${repo.repo}/stats/${endpoint}`
}

export function getCommitActivity(repo: RepoRef, options?: PollOptions) {
  return pollStats<WeeklyCommitActivity[]>(statsPath(repo, 'commit_activity'), options)
}

export function getContributorStats(repo: RepoRef, options?: PollOptions) {
  return pollStats<ContributorStats[]>(statsPath(repo, 'contributors'), options)
}

export function getCodeFrequency(repo: RepoRef, options?: PollOptions) {
  return pollStats<CodeFrequencyPoint[]>(statsPath(repo, 'code_frequency'), options)
}

export function getPunchCard(repo: RepoRef, options?: PollOptions) {
  return pollStats<PunchCardPoint[]>(statsPath(repo, 'punch_card'), options)
}
