import { useCallback, useState } from 'react'
import type { RepoRef } from './parseRepoUrl'
import {
  getCodeFrequency,
  getCommitActivity,
  getContributorStats,
  getPunchCard,
  type CodeFrequencyPoint,
  type ContributorStats,
  type PunchCardPoint,
  type WeeklyCommitActivity,
} from './stats'

export type StatsEndpointKey = 'commitActivity' | 'contributors' | 'codeFrequency' | 'punchCard'

export interface StatsProgress {
  status: 'pending' | 'retrying' | 'done' | 'error'
  attempt: number
}

export interface RepoStatsResult {
  commitActivity: WeeklyCommitActivity[]
  contributors: ContributorStats[]
  codeFrequency: CodeFrequencyPoint[]
  punchCard: PunchCardPoint[]
}

function initialProgress(): Record<StatsEndpointKey, StatsProgress> {
  return {
    commitActivity: { status: 'pending', attempt: 0 },
    contributors: { status: 'pending', attempt: 0 },
    codeFrequency: { status: 'pending', attempt: 0 },
    punchCard: { status: 'pending', attempt: 0 },
  }
}

export function useRepoStats() {
  const [progress, setProgress] = useState<Record<StatsEndpointKey, StatsProgress>>(
    initialProgress(),
  )
  const [result, setResult] = useState<RepoStatsResult | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const run = useCallback(async (repo: RepoRef, signal?: AbortSignal) => {
    setResult(null)
    setError(null)
    setProgress(initialProgress())

    const mark = (key: StatsEndpointKey, patch: Partial<StatsProgress>) =>
      setProgress((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))

    const fetchOne = async <T,>(key: StatsEndpointKey, fetcher: () => Promise<T>): Promise<T> => {
      try {
        const data = await fetcher()
        mark(key, { status: 'done' })
        return data
      } catch (err) {
        mark(key, { status: 'error' })
        throw err
      }
    }

    try {
      const [commitActivity, contributors, codeFrequency, punchCard] = await Promise.all([
        fetchOne('commitActivity', () =>
          getCommitActivity(repo, {
            signal,
            onRetry: (attempt) => mark('commitActivity', { status: 'retrying', attempt }),
          }),
        ),
        fetchOne('contributors', () =>
          getContributorStats(repo, {
            signal,
            onRetry: (attempt) => mark('contributors', { status: 'retrying', attempt }),
          }),
        ),
        fetchOne('codeFrequency', () =>
          getCodeFrequency(repo, {
            signal,
            onRetry: (attempt) => mark('codeFrequency', { status: 'retrying', attempt }),
          }),
        ),
        fetchOne('punchCard', () =>
          getPunchCard(repo, {
            signal,
            onRetry: (attempt) => mark('punchCard', { status: 'retrying', attempt }),
          }),
        ),
      ])

      setResult({ commitActivity, contributors, codeFrequency, punchCard })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err : new Error('Unknown error fetching stats'))
    }
  }, [])

  return { progress, result, error, run }
}
