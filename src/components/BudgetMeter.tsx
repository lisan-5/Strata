import { useRateLimit } from '../lib/github/useRateLimit'

export function BudgetMeter() {
  const { limit, remaining } = useRateLimit()
  const pct = limit > 0 ? Math.round((remaining / limit) * 100) : 0
  const tone = pct > 50 ? 'bg-emerald-400' : pct > 20 ? 'bg-amber-400' : 'bg-rose-400'

  return (
    <div
      className="flex items-center gap-2"
      title={`${remaining} of ${limit} GitHub API requests remaining this hour`}
    >
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-slate-400">
        {remaining}/{limit}
      </span>
    </div>
  )
}
