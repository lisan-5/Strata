import { useCallback, useState } from 'react'
import { fetchCommits, type CommitSummary } from './commits'
import type { RepoRef } from './parseRepoUrl'
import type { BasicCommitStats, MessageCultureResult } from '../../workers/commitAnalysis.types'
import { computeBasicStats, computeMessageCulture } from '../../workers/commitAnalysisClient'

export type CommitAnalysisStatus = 'idle' | 'fetching' | 'analyzing' | 'done' | 'error'

export interface CommitAnalysisState {
  status: CommitAnalysisStatus
  fetchedCount: number
  estimatedTotal: number | null
  truncated: boolean
  commits: CommitSummary[] | null
  basicStats: BasicCommitStats | null
  cultureStats: MessageCultureResult | null
  error: Error | null
}

const initialState: CommitAnalysisState = {
  status: 'idle',
  fetchedCount: 0,
  estimatedTotal: null,
  truncated: false,
  commits: null,
  basicStats: null,
  cultureStats: null,
  error: null,
}

/**
 * Fetches raw commits (paginated, rate-limit-costly) and hands them to a
 * Web Worker for aggregation — this is the "loop over commits" path, and it
 * never runs on the main thread, no exceptions. Message-culture analysis
 * reuses these same commits (already paid for), so it runs alongside the
 * basic author/date stats rather than behind its own opt-in.
 */
export function useCommitAnalysis() {
  const [state, setState] = useState<CommitAnalysisState>(initialState)

  const run = useCallback(async (repo: RepoRef, signal?: AbortSignal) => {
    setState({ ...initialState, status: 'fetching' })

    try {
      const { commits, truncated } = await fetchCommits(repo, {
        signal,
        onPage: (fetched, total) =>
          setState((prev) => ({ ...prev, fetchedCount: fetched, estimatedTotal: total })),
      })

      setState((prev) => ({ ...prev, status: 'analyzing', commits, truncated }))

      const [basicStats, cultureStats] = await Promise.all([
        computeBasicStats(commits),
        computeMessageCulture(commits),
      ])

      setState((prev) => ({ ...prev, status: 'done', basicStats, cultureStats }))
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setState(initialState)
        return
      }
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err : new Error('Unknown error analyzing commits'),
      }))
    }
  }, [])

  return { ...state, run }
}
