import { useEffect, useRef, useState } from 'react'
import { Layout } from './components/Layout'
import { RepoInput } from './components/RepoInput'
import { StatsProgressPanel } from './components/StatsProgressPanel'
import type { RepoRef } from './lib/github/parseRepoUrl'
import { checkRateLimit } from './lib/github/checkRateLimit'
import { useRepoStats } from './lib/github/useRepoStats'

function App() {
  const [repo, setRepo] = useState<RepoRef | null>(null)
  const { progress, result, error, run } = useRepoStats()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    checkRateLimit().catch(() => {
      // Best-effort: leave the budget meter at its optimistic default if this fails.
    })
  }, [])

  function handleSubmit(next: RepoRef) {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRepo(next)
    void run(next, controller.signal)
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
        <div className="mt-16 rounded-xl border border-white/10 bg-white/3 p-6 text-left">
          <p className="font-mono text-sm text-slate-400">
            {repo.owner}/{repo.repo}
          </p>
          <div className="mt-4">
            <StatsProgressPanel progress={progress} />
          </div>
          {error && <p className="mt-4 text-sm text-rose-400">{error.message}</p>}
          {result && (
            <p className="mt-4 text-sm text-emerald-400">
              Resolved — {result.commitActivity.length} weeks of commit activity,{' '}
              {result.contributors.length} contributors tracked.
            </p>
          )}
        </div>
      )}
    </Layout>
  )
}

export default App
