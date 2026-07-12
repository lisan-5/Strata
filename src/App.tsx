import { useEffect, useState } from 'react'
import { Layout } from './components/Layout'
import { RepoInput } from './components/RepoInput'
import type { RepoRef } from './lib/github/parseRepoUrl'
import { checkRateLimit } from './lib/github/checkRateLimit'

function App() {
  const [repo, setRepo] = useState<RepoRef | null>(null)

  useEffect(() => {
    checkRateLimit().catch(() => {
      // Best-effort: leave the budget meter at its optimistic default if this fails.
    })
  }, [])

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
        <RepoInput onSubmit={setRepo} />
      </div>

      {repo && (
        <div className="mt-16 rounded-xl border border-white/10 bg-white/3 p-6 text-left">
          <p className="font-mono text-sm text-slate-400">
            {repo.owner}/{repo.repo}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Analysis pipeline not wired up yet — this is the landing shell.
          </p>
        </div>
      )}
    </Layout>
  )
}

export default App
