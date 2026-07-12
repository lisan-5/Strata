import { useState, type FormEvent } from 'react'
import { parseRepoUrl, type RepoRef } from '../lib/github/parseRepoUrl'

interface RepoInputProps {
  onSubmit: (repo: RepoRef) => void
  disabled?: boolean
}

export function RepoInput({ onSubmit, disabled }: RepoInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const repo = parseRepoUrl(value)
    if (!repo) {
      setError('Enter a GitHub repo URL or owner/repo, e.g. facebook/react')
      return
    }
    setError(null)
    onSubmit(repo)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="github.com/owner/repo"
          disabled={disabled}
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-violet-400/60 focus:ring-2 focus:ring-violet-400/20 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg bg-violet-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Excavate
        </button>
      </div>
      {error && <p className="mt-2 text-left text-sm text-rose-400">{error}</p>}
    </form>
  )
}
