import { useCallback, useRef, useState } from 'react'
import { fetchCommits, type CommitSummary } from './commits'
import type { RepoRef } from './parseRepoUrl'
import type { BasicCommitStats, WorkerResponse } from '../../workers/commitAnalysis.types'

export type CommitAnalysisStatus = 'idle' | 'fetching' | 'analyzing' | 'done' | 'error'

export interface CommitAnalysisState {
  status: CommitAnalysisStatus
  fetchedCount: number
  estimatedTotal: number | null
  truncated: boolean
  commits: CommitSummary[] | null
  basicStats: BasicCommitStats | null
  error: Error | null
}

const initialState: CommitAnalysisState = {
  status: 'idle',
  fetchedCount: 0,
  estimatedTotal: null,
  truncated: false,
  commits: null,
  basicStats: null,
  error: null,
}

/**
 * Fetches raw commits (paginated, rate-limit-costly) and hands them to a
 * Web Worker for aggregation — this is the "loop over commits" path, and it
 * never runs on the main thread, no exceptions.
 */
export function useCommitAnalysis() {
  const [state, setState] = useState<CommitAnalysisState>(initialState)
  const workerRef = useRef<Worker | null>(null)

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../workers/commitAnalysis.worker.ts', import.meta.url),
        { type: 'module' },
      )
    }
    return workerRef.current
  }, [])

  const run = useCallback(
    async (repo: RepoRef, signal?: AbortSignal) => {
      setState({ ...initialState, status: 'fetching' })

      try {
        const { commits, truncated } = await fetchCommits(repo, {
          signal,
          onPage: (fetched, total) =>
            setState((prev) => ({ ...prev, fetchedCount: fetched, estimatedTotal: total })),
        })

        setState((prev) => ({ ...prev, status: 'analyzing', commits, truncated }))

        const worker = getWorker()
        const result = await new Promise<BasicCommitStats>((resolve, reject) => {
          const handleMessage = (event: MessageEvent<WorkerResponse>) => {
            if (event.data.type === 'basic-stats') {
              worker.removeEventListener('message', handleMessage)
              resolve(event.data.result)
            }
          }
          worker.addEventListener('message', handleMessage)
          worker.addEventListener(
            'error',
            (event) => {
              worker.removeEventListener('message', handleMessage)
              reject(new Error(event.message))
            },
            { once: true },
          )
          worker.postMessage({ type: 'basic-stats', commits })
        })

        setState((prev) => ({ ...prev, status: 'done', basicStats: result }))
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
    },
    [getWorker],
  )

  return { ...state, run }
}
