import { useMemo, useState } from 'react'
import type { PunchCardPoint } from '../../lib/github/stats'
import { ChartTooltip } from './ChartTooltip'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CELL = 26
const MAX_RADIUS = 10
const DOT_COLOR = '#a78bfa'
const LABEL_GUTTER = 32

interface HoverState {
  x: number
  y: number
  day: number
  hour: number
  count: number
}

export function PunchCard({ points }: { points: PunchCardPoint[] }) {
  const [hover, setHover] = useState<HoverState | null>(null)

  const grid = useMemo(() => {
    const byKey = new Map<string, number>()
    for (const [day, hour, count] of points) {
      byKey.set(`${day}-${hour}`, count)
    }
    return byKey
  }, [points])

  const maxCount = useMemo(
    () => points.reduce((max, [, , count]) => Math.max(max, count), 0),
    [points],
  )

  if (points.length === 0 || maxCount === 0) {
    return <p className="text-sm text-slate-500">Not enough commit history for a punch card.</p>
  }

  const width = 24 * CELL
  const height = 7 * CELL

  return (
    <div className="overflow-x-auto">
      <svg width={width + LABEL_GUTTER} height={height + 16} className="block">
        <g transform={`translate(${LABEL_GUTTER}, 12)`}>
          {[0, 6, 12, 18, 23].map((hour) => (
            <text
              key={hour}
              x={hour * CELL + CELL / 2}
              y={-2}
              textAnchor="middle"
              className="fill-slate-500 text-[9px]"
            >
              {hour}
            </text>
          ))}
          {DAY_LABELS.map((label, day) => (
            <text
              key={label}
              x={-8}
              y={day * CELL + CELL / 2 + 3}
              textAnchor="end"
              className="fill-slate-500 text-[9px]"
            >
              {label}
            </text>
          ))}
          {DAY_LABELS.map((_, day) =>
            Array.from({ length: 24 }, (_, hour) => {
              const count = grid.get(`${day}-${hour}`) ?? 0
              const radius = count === 0 ? 0 : Math.max(2, Math.sqrt(count / maxCount) * MAX_RADIUS)
              const cx = hour * CELL + CELL / 2
              const cy = day * CELL + CELL / 2
              return (
                <g
                  key={`${day}-${hour}`}
                  onPointerEnter={(event) =>
                    setHover({ x: event.clientX, y: event.clientY, day, hour, count })
                  }
                  onPointerLeave={() => setHover(null)}
                >
                  <rect x={hour * CELL} y={day * CELL} width={CELL} height={CELL} fill="transparent" />
                  {radius > 0 && <circle cx={cx} cy={cy} r={radius} fill={DOT_COLOR} fillOpacity={0.85} />}
                </g>
              )
            }),
          )}
        </g>
      </svg>
      {hover && (
        <ChartTooltip
          x={hover.x}
          y={hover.y}
          value={`${hover.count} commit${hover.count === 1 ? '' : 's'}`}
          label={`${DAY_LABELS[hover.day]} at ${hover.hour}:00 UTC`}
        />
      )}
    </div>
  )
}
