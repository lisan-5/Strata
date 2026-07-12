import type { MessageCultureResult } from '../../workers/commitAnalysis.types'
import { ChartCard } from './ChartCard'

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  )
}

export function MessageCultureCard({ stats }: { stats: MessageCultureResult }) {
  const maxTypeCount = Math.max(...stats.typeBreakdown.map((t) => t.count), 1)

  return (
    <ChartCard
      title="Commit message culture"
      description={`Across ${stats.totalMessages} messages`}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Conventional commits" value={pct(stats.conventionalCommitRate)} />
        <StatTile
          label="Avg subject length"
          value={`${Math.round(stats.averageSubjectLength)} chars`}
        />
        <StatTile label="Emoji commits" value={pct(stats.emojiRate)} />
        <StatTile label="WIP / fixup" value={pct(stats.fixupRate)} />
      </div>

      <div className="mt-6">
        <h4 className="text-xs font-medium text-slate-400">Commit types</h4>
        <ul className="mt-2 space-y-1.5">
          {stats.typeBreakdown.slice(0, 8).map((row) => (
            <li key={row.type} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-slate-400">{row.type}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${(row.count / maxTypeCount) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-slate-300">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>

      {stats.topLeadingWords.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-medium text-slate-400">Common leading words</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats.topLeadingWords.map((row) => (
              <span
                key={row.word}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
              >
                {row.word} <span className="text-slate-500">×{row.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  )
}
