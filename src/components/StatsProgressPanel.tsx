import type { StatsEndpointKey, StatsProgress } from '../lib/github/useRepoStats'

const LABELS: Record<StatsEndpointKey, string> = {
  commitActivity: 'Commit activity (52 weeks)',
  contributors: 'Contributor stats',
  codeFrequency: 'Code frequency (additions/deletions)',
  punchCard: 'Punch card (hour × weekday)',
}

const STATUS_TONE: Record<StatsProgress['status'], string> = {
  pending: 'text-slate-500',
  retrying: 'text-amber-400',
  done: 'text-emerald-400',
  error: 'text-rose-400',
}

function statusLabel(progress: StatsProgress): string {
  switch (progress.status) {
    case 'pending':
      return 'queued'
    case 'retrying':
      return `GitHub is computing this (202), retry ${progress.attempt}…`
    case 'done':
      return 'done'
    case 'error':
      return 'failed'
  }
}

export function StatsProgressPanel({
  progress,
}: {
  progress: Record<StatsEndpointKey, StatsProgress>
}) {
  return (
    <ul className="space-y-2 text-sm">
      {(Object.keys(progress) as StatsEndpointKey[]).map((key) => {
        const item = progress[key]
        return (
          <li key={key} className="flex items-center justify-between gap-4">
            <span className="text-slate-300">{LABELS[key]}</span>
            <span className={STATUS_TONE[item.status]}>{statusLabel(item)}</span>
          </li>
        )
      })}
    </ul>
  )
}
