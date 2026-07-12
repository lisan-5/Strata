import { useCallback, useState } from 'react'
import { fetchCommitFiles } from './fileChurn'
import type { CommitSummary } from './commits'
import type { RepoRef } from './parseRepoUrl'
import type { FileChurnRecord } from '../../workers/commitAnalysis.types'
import { computeFileChurn } from '../../workers/commitAnalysisClient'

export type FileChurnStatus = 'idle' | 'fetching' | 'analyzing' | 'done' | 'error'

export interface FileChurnState {
  status: FileChurnStatus
  progress: { done: number; total: number }
  records: FileChurnRecord[] | null
  sampleSize: number
  error: Error | null
}

const initialState: FileChurnState = {
  status: 'idle',
  progress: { done: 0, total: 0 },
  records: null,
  sampleSize: 0,
  error: null,
}

/** Samples the N most recent commits' file diffs — each costs one request. */
export function useFileChurn() {
  const [state, setState] = useState<FileChurnState>(initialState)

  const run = useCallback(
    async (repo: RepoRef, commits: CommitSummary[], sampleSize: number, signal?: AbortSignal) => {
      const sample = commits.slice(0, sampleSize)
      setState({ ...initialState, status: 'fetching', sampleSize: sample.length })

      try {
        const fileCommits = await fetchCommitFiles(
          repo,
          sample.map((c) => c.sha),
          {
            signal,
            onProgress: (done, total) => setState((prev) => ({ ...prev, progress: { done, total } })),
          },
        )

        setState((prev) => ({ ...prev, status: 'analyzing' }))
        const records = await computeFileChurn(sample, fileCommits)
        setState((prev) => ({ ...prev, status: 'done', records }))
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setState(initialState)
          return
        }
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err : new Error('Unknown error analyzing file churn'),
        }))
      }
    },
    [],
  )

  return { ...state, run }
}
