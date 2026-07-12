import type { FileChurnState } from '../../lib/github/useFileChurn'
import { ChartCard } from './ChartCard'
import { FileChurnTreemap } from './FileChurnTreemap'

const SAMPLE_SIZE = 50

interface FileChurnCardProps {
  availableCommits: number
  state: FileChurnState
  onRun: (sampleSize: number) => void
}

export function FileChurnCard({ availableCommits, state, onRun }: FileChurnCardProps) {
  const sampleSize = Math.min(SAMPLE_SIZE, availableCommits)

  return (
    <ChartCard
      title="File churn"
      description="Which files change most, and who else could maintain them"
    >
      {state.status === 'idle' && (
        <button
          type="button"
          onClick={() => onRun(sampleSize)}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
        >
          Sample {sampleSize} most recent commits ({sampleSize} more requests)
        </button>
      )}

      {state.status === 'fetching' && (
        <p className="text-sm text-slate-400">
          Fetching file diffs… {state.progress.done}/{state.progress.total}
        </p>
      )}

      {state.status === 'analyzing' && (
        <p className="text-sm text-slate-400">Aggregating file churn in a Web Worker…</p>
      )}

      {state.status === 'error' && <p className="text-sm text-rose-400">{state.error?.message}</p>}

      {state.status === 'done' && state.records && (
        <div>
          <p className="mb-3 text-xs text-slate-500">
            Based on the {state.sampleSize} most recent commits, not full history.
          </p>
          <FileChurnTreemap records={state.records} />
        </div>
      )}
    </ChartCard>
  )
}
