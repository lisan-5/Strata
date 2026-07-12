import { useMemo, useState } from 'react'
import { area as d3Area, curveBasis, extent, scaleLinear, stack, stackOffsetWiggle, stackOrderInsideOut } from 'd3'
import type { ContributorStats } from '../../lib/github/stats'
import { prepareStreamgraph, type StreamPoint } from '../../lib/viz/prepareStreamgraph'

const WIDTH = 720
const HEIGHT = 220
const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 }
const INNER_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const INNER_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

interface HoverState {
  x: number
  weekLabel: string
  rows: { key: string; color: string; value: number }[]
}

export function ContributorStreamgraph({ contributors }: { contributors: ContributorStats[] }) {
  const [hover, setHover] = useState<HoverState | null>(null)
  const { points, series } = useMemo(() => prepareStreamgraph(contributors), [contributors])

  if (points.length === 0 || series.length === 0) {
    return <p className="text-sm text-slate-500">No named contributor history to plot.</p>
  }

  const keys = series.map((s) => s.key)
  const layers = stack<StreamPoint>()
    .keys(keys)
    .offset(stackOffsetWiggle)
    .order(stackOrderInsideOut)(points)

  const weekExtent = extent(points, (p) => p.week) as [number, number]
  const x = scaleLinear().domain(weekExtent).range([0, INNER_WIDTH])

  const yValues = layers.flatMap((layer) => layer.flatMap((d) => [d[0], d[1]]))
  const y = scaleLinear().domain(extent(yValues) as [number, number]).range([INNER_HEIGHT, 0])

  const area = d3Area<(typeof layers)[number][number]>()
    .x((_, i) => x(points[i].week))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(curveBasis)

  function handleMove(event: React.PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const localX = event.clientX - rect.left
    const week = x.invert(localX)
    let nearest = points[0]
    let nearestDist = Infinity
    for (const point of points) {
      const dist = Math.abs(point.week - week)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = point
      }
    }
    const rows = series
      .map((s) => ({ key: s.key, color: s.color, value: nearest[s.key] }))
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    setHover({
      x: localX + MARGIN.left,
      weekLabel: new Date(nearest.week * 1000).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
      }),
      rows,
    })
  }

  return (
    <div className="relative">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full">
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {layers.map((layer, i) => (
            <path key={series[i].key} d={area(layer) ?? undefined} fill={series[i].color} fillOpacity={0.85} />
          ))}
          <rect
            x={0}
            y={0}
            width={INNER_WIDTH}
            height={INNER_HEIGHT}
            fill="transparent"
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          />
        </g>
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-md border border-white/10 bg-[#12141b] px-3 py-2 text-xs shadow-xl"
          style={{ left: hover.x, top: 4 }}
        >
          <div className="font-mono text-slate-500">{hover.weekLabel}</div>
          {hover.rows.map((row) => (
            <div key={row.key} className="mt-1 flex items-center gap-2">
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: row.color }} />
              <span className="font-mono font-semibold text-slate-100">{row.value}</span>
              <span className="text-slate-500">{row.key}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.color }} />
            {s.key}
          </span>
        ))}
      </div>
    </div>
  )
}
