import { useMemo, useState } from 'react'
import type { Era } from '../../lib/era/detectEras'
import { CATEGORICAL_DARK, OTHER_COLOR } from '../../lib/viz/categoricalPalette'
import { ChartTooltip } from './ChartTooltip'

const WIDTH = 720
const BAR_HEIGHT = 40

interface HoverState {
  x: number
  y: number
  era: Era
}

function formatWeek(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

export function EraTimeline({ eras }: { eras: Era[] }) {
  const [hover, setHover] = useState<HoverState | null>(null)
  const totalWeeks = useMemo(() => eras.reduce((sum, e) => sum + e.weekCount, 0), [eras])

  if (eras.length === 0) {
    return <p className="text-sm text-slate-500">Not enough contributor history to detect eras.</p>
  }

  let cursor = 0
  const segments = eras.map((era, index) => {
    const width = (era.weekCount / totalWeeks) * WIDTH
    const x = cursor
    cursor += width
    return {
      era,
      x,
      width,
      color: era.isDormant ? OTHER_COLOR : CATEGORICAL_DARK[index % CATEGORICAL_DARK.length],
    }
  })

  return (
    <div>
      <svg width={WIDTH} height={BAR_HEIGHT} viewBox={`0 0 ${WIDTH} ${BAR_HEIGHT}`} className="block w-full">
        {segments.map(({ era, x, width, color }) => (
          <rect
            key={era.startWeek}
            x={x}
            y={0}
            width={Math.max(width - 1, 0)}
            height={BAR_HEIGHT}
            rx={3}
            fill={color}
            fillOpacity={era.isDormant ? 0.5 : 0.9}
            onPointerEnter={(event) => setHover({ x: event.clientX, y: event.clientY, era })}
            onPointerLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover && (
        <ChartTooltip
          x={hover.x}
          y={hover.y}
          value={hover.era.label}
          label={`${formatWeek(hover.era.startWeek)} – ${formatWeek(hover.era.endWeek)}`}
        />
      )}
      <ul className="mt-4 space-y-3">
        {segments.map(({ era, color }) => (
          <li key={era.startWeek} className="flex gap-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-slate-200">{era.label}</span>
                <span className="text-xs text-slate-500">
                  {formatWeek(era.startWeek)} – {formatWeek(era.endWeek)}
                </span>
              </div>
              <p className="text-xs text-slate-500">{era.description}</p>
              {!era.isDormant && era.topContributors.length > 0 && (
                <p className="mt-0.5 text-xs text-slate-600">
                  Top: {era.topContributors.slice(0, 3).map((c) => c.author).join(', ')}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
