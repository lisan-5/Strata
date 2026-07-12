import { useMemo, useState } from 'react'
import type { WeeklyCommitActivity } from '../../lib/github/stats'
import { intensityColor } from '../../lib/viz/violetScale'
import { ChartTooltip } from './ChartTooltip'

const CELL = 11
const GAP = 3
const STEP = CELL + GAP
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

interface HoverState {
  x: number
  y: number
  count: number
  date: Date
}

export function ActivityHeatmap({ weeks }: { weeks: WeeklyCommitActivity[] }) {
  const [hover, setHover] = useState<HoverState | null>(null)

  const maxDayCount = useMemo(
    () => weeks.reduce((max, week) => Math.max(max, ...week.days), 0),
    [weeks],
  )

  const monthTicks = useMemo(() => {
    const ticks: { index: number; label: string }[] = []
    let lastMonth = -1
    weeks.forEach((week, index) => {
      const month = new Date(week.week * 1000).getUTCMonth()
      if (month !== lastMonth) {
        ticks.push({ index, label: MONTH_LABELS[month] })
        lastMonth = month
      }
    })
    return ticks
  }, [weeks])

  if (weeks.length === 0) {
    return <p className="text-sm text-slate-500">No commit activity in the last year.</p>
  }

  const width = weeks.length * STEP
  const height = 7 * STEP

  return (
    <div className="overflow-x-auto">
      <svg width={width + 28} height={height + 16} className="block">
        <g transform="translate(28, 16)">
          {monthTicks.map((tick) => (
            <text key={tick.index} x={tick.index * STEP} y={-4} className="fill-slate-500 text-[10px]">
              {tick.label}
            </text>
          ))}
          {DAY_LABELS.map((label, day) =>
            day % 2 === 1 ? (
              <text
                key={label}
                x={-6}
                y={day * STEP + CELL}
                textAnchor="end"
                className="fill-slate-500 text-[9px]"
              >
                {label}
              </text>
            ) : null,
          )}
          {weeks.map((week, weekIndex) =>
            week.days.map((count, day) => {
              const x = weekIndex * STEP
              const y = day * STEP
              return (
                <rect
                  key={`${weekIndex}-${day}`}
                  x={x}
                  y={y}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={intensityColor(count, maxDayCount)}
                  onPointerEnter={(event) =>
                    setHover({
                      x: event.clientX,
                      y: event.clientY,
                      count,
                      date: new Date((week.week + day * 86400) * 1000),
                    })
                  }
                  onPointerLeave={() => setHover(null)}
                />
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
          label={hover.date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        />
      )}
    </div>
  )
}
