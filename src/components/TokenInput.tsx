import { useState } from 'react'
import { getToken, setToken } from '../lib/github/token'
import { checkRateLimit } from '../lib/github/checkRateLimit'

type Status = 'idle' | 'checking' | 'ok' | 'error'

export function TokenInput() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(() => getToken() ?? '')
  const [status, setStatus] = useState<Status>('idle')
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()))

  async function handleSave() {
    const trimmed = value.trim()
    setToken(trimmed || null)
    setHasToken(Boolean(trimmed))

    if (!trimmed) {
      setStatus('idle')
      return
    }

    setStatus('checking')
    try {
      await checkRateLimit()
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-xs text-slate-400 underline decoration-dotted hover:text-slate-200"
      >
        {hasToken ? 'token set' : 'add token'}
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-10 w-72 rounded-lg border border-white/10 bg-[#12141b] p-3 shadow-xl">
          <p className="text-xs text-slate-400">
            A personal access token raises your GitHub rate limit from 60 to
            5,000 requests/hour. It only needs public read access, and is
            stored in your browser's localStorage — never sent anywhere but
            api.github.com.
          </p>
          <input
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="ghp_..."
            className="mt-2 w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-violet-400/60"
          />
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-violet-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-400"
            >
              Save
            </button>
            {status === 'checking' && <span className="text-xs text-slate-500">checking…</span>}
            {status === 'ok' && <span className="text-xs text-emerald-400">valid</span>}
            {status === 'error' && <span className="text-xs text-rose-400">invalid token</span>}
          </div>
        </div>
      )}
    </div>
  )
}
