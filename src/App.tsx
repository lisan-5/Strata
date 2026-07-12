import { useEffect, useMemo, useRef, useState } from 'react'
import { Layout } from './components/Layout'
import { RepoInput } from './components/RepoInput'
import { StatsProgressPanel } from './components/StatsProgressPanel'
import { ChartCard } from './components/charts/ChartCard'
import { ActivityHeatmap } from './components/charts/ActivityHeatmap'
import { PunchCard } from './components/charts/PunchCard'
import { ContributorStreamgraph } from './components/charts/ContributorStreamgraph'
import { EraTimeline } from './components/charts/EraTimeline'
import { CommitAnalysisCard } from './components/charts/CommitAnalysisCard'
import { FileChurnCard } from './components/charts/FileChurnCard'
import { MessageCultureCard } from './components/charts/MessageCultureCard'
import type { RepoRef } from './lib/github/parseRepoUrl'
import { checkRateLimit } from './lib/github/checkRateLimit'
import { useRepoStats } from './lib/github/useRepoStats'
import { useCommitAnalysis } from './lib/github/useCommitAnalysis'
import { useFileChurn } from './lib/github/useFileChurn'
import { detectEras } from './lib/era/detectEras'

function App() {
  const [repo, setRepo] = useState<RepoRef | null>(null)
  const { progress, result, error, run } = useRepoStats()
  const eras = useMemo(() => (result ? detectEras(result.contributors) : []), [result])
  const commitAnalysis = useCommitAnalysis()
  const fileChurn = useFileChurn()
  const abortRef = useRef<AbortController | null>(null)
  const commitAbortRef = useRef<AbortController | null>(null)
  const fileChurnAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    checkRateLimit().catch(() => {
      // Best-effort: leave the budget meter at its optimistic default if this fails.
    })
  }, [])

  function handleSubmit(next: RepoRef) {
    abortRef.current?.abort()
    commitAbortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRepo(next)
    void run(next, controller.signal)
  }

  function handleAnalyzeCommits() {
    if (!repo) return
    commitAbortRef.current?.abort()
    const controller = new AbortController()
    commitAbortRef.current = controller
    void commitAnalysis.run(repo, controller.signal)
  }

  function handleAnalyzeFileChurn(sampleSize: number) {
    if (!repo || !commitAnalysis.commits) return
    fileChurnAbortRef.current?.abort()
    const controller = new AbortController()
    fileChurnAbortRef.current = controller
    void fileChurn.run(repo, commitAnalysis.commits, sampleSize, controller.signal)
  }

  return (
    <Layout>
      <div className="flex flex-col items-center gap-6 pt-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
          Excavate a repo's entire life
        </h1>
        <p className="max-w-lg text-balance text-slate-400">
          Paste a GitHub repo URL. Strata segments its history into named
          eras, maps contributor churn, and finds the bus-factor risks — all
          in your browser, no backend.
        </p>
        <RepoInput onSubmit={handleSubmit} />
      </div>

      {repo && (
        <div className="mt-16 text-left">
          <p className="font-mono text-sm text-slate-400">
            {repo.owner}/{repo.repo}
          </p>

          {!result && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/3 p-6">
              <StatsProgressPanel progress={progress} />
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-400">{error.message}</p>}

          {result && (
            <div className="mt-4 grid gap-6">
              <ChartCard title="Eras" description="Automatically segmented from the full commit history">
                <EraTimeline eras={eras} />
              </ChartCard>
              <ChartCard title="Activity" description="Commits per day, last 52 weeks">
                <ActivityHeatmap weeks={result.commitActivity} />
              </ChartCard>
              <ChartCard
                title="Punch card"
                description="When commits land, by hour and weekday (UTC)"
              >
                <PunchCard points={result.punchCard} />
              </ChartCard>
              <ChartCard
                title="Contributors over time"
                description="Weekly commits per contributor, full history"
              >
                <ContributorStreamgraph contributors={result.contributors} />
              </ChartCard>
              <CommitAnalysisCard
                repo={repo}
                state={commitAnalysis}
                onRun={handleAnalyzeCommits}
              />
              {commitAnalysis.commits && (
                <FileChurnCard
                  availableCommits={commitAnalysis.commits.length}
                  state={fileChurn}
                  onRun={handleAnalyzeFileChurn}
                />
              )}
              {commitAnalysis.cultureStats && (
                <MessageCultureCard stats={commitAnalysis.cultureStats} />
              )}
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}

export default App
