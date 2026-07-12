import type { RepoRef } from '../../lib/github/parseRepoUrl'
import type { CommitAnalysisState } from '../../lib/github/useCommitAnalysis'
import { ChartCard } from './ChartCard'

interface CommitAnalysisCardProps {
  repo: RepoRef
  state: CommitAnalysisState
  onRun: () => void
}

export function CommitAnalysisCard({ state, onRun }: CommitAnalysisCardProps) {
  return (
    <ChartCard
      title="Commit history"
      description="Raw commit list — costs one request per 100 commits, so it's opt-in"
    >
      {state.status === 'idle' && (
        <button
          type="button"
          onClick={onRun}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
        >
          Fetch and analyze commit history
        </button>
      )}

      {state.status === 'fetching' && (
        <p className="text-sm text-slate-400">
          Fetching commits… {state.fetchedCount}
          {state.estimatedTotal ? ` of ~${state.estimatedTotal}` : ''} so far
        </p>
      )}

      {state.status === 'analyzing' && (
        <p className="text-sm text-slate-400">
          Aggregating {state.commits?.length ?? 0} commits in a Web Worker…
        </p>
      )}

      {state.status === 'error' && (
        <p className="text-sm text-rose-400">{state.error?.message}</p>
      )}

      {state.status === 'done' && state.basicStats && (
        <div className="space-y-3 text-sm">
          {state.truncated && (
            <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
              Showing the {state.basicStats.totalCommits} most recent commits — history is
              longer than that.
            </p>
          )}
          <p className="text-slate-300">
            {state.basicStats.totalCommits} commits analyzed across{' '}
            {state.basicStats.uniqueAuthors} authors
            {state.basicStats.firstCommitDate && state.basicStats.lastCommitDate && (
              <>
                {' '}
                (
                {new Date(state.basicStats.firstCommitDate).toLocaleDateString()} –{' '}
                {new Date(state.basicStats.lastCommitDate).toLocaleDateString()})
              </>
            )}
          </p>
          <ul className="space-y-1">
            {state.basicStats.commitsPerAuthor.slice(0, 5).map((row) => (
              <li key={row.author} className="flex justify-between text-slate-400">
                <span>{row.author}</span>
                <span className="font-mono text-slate-300">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}
