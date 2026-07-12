import { useMemo, useState } from 'react'
import type { BusFactorRisk, FileChurnRecord } from '../../workers/commitAnalysis.types'
import { layoutFileTree, type LayoutNode } from '../../lib/viz/buildFileTree'
import { ChartTooltip } from './ChartTooltip'

const WIDTH = 720
const HEIGHT = 320

const RISK_COLOR: Record<BusFactorRisk, string> = {
  'single-owner': '#d03b3b',
  concentrated: '#c98500',
  distributed: '#374151',
}

const RISK_LABEL: Record<BusFactorRisk, string> = {
  'single-owner': 'single owner — bus-factor risk',
  concentrated: '2 authors in this sample',
  distributed: '3+ authors in this sample',
}

interface HoverState {
  x: number
  y: number
  node: LayoutNode
}

function truncateForWidth(name: string, width: number): string | null {
  const maxChars = Math.floor((width - 8) / 6)
  if (maxChars < 3) return null
  if (name.length <= maxChars) return name
  return `${name.slice(0, maxChars - 1)}…`
}

export function FileChurnTreemap({ records }: { records: FileChurnRecord[] }) {
  const [hover, setHover] = useState<HoverState | null>(null)
  const nodes = useMemo(() => layoutFileTree(records, WIDTH, HEIGHT), [records])
  const riskyFiles = useMemo(
    () => records.filter((r) => r.risk === 'single-owner').sort((a, b) => b.churn - a.churn),
    [records],
  )

  if (records.length === 0) {
    return <p className="text-sm text-slate-500">No file changes in the sampled commits.</p>
  }

  return (
    <div>
      {riskyFiles.length > 0 && (
        <div className="mb-4 rounded-md border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-xs text-rose-300">
          ⚠ {riskyFiles.length} file{riskyFiles.length === 1 ? '' : 's'} touched by only one
          person in this sample: {riskyFiles.slice(0, 5).map((f) => f.path).join(', ')}
          {riskyFiles.length > 5 ? `, +${riskyFiles.length - 5} more` : ''}
        </div>
      )}
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block w-full">
        {nodes.map((node) => {
          const w = node.x1 - node.x0
          const h = node.y1 - node.y0
          const label = h > 16 ? truncateForWidth(node.path.split('/').pop() ?? node.path, w) : null
          return (
            <g
              key={node.path}
              onPointerEnter={(event) => setHover({ x: event.clientX, y: event.clientY, node })}
              onPointerLeave={() => setHover(null)}
            >
              <rect
                x={node.x0}
                y={node.y0}
                width={w}
                height={h}
                fill={RISK_COLOR[node.record.risk]}
                fillOpacity={node.record.risk === 'distributed' ? 0.6 : 0.85}
                stroke="#0b0d12"
                strokeWidth={1}
              />
              {label && (
                <text
                  x={node.x0 + 4}
                  y={node.y0 + 14}
                  className="fill-white text-[10px]"
                  style={{ pointerEvents: 'none' }}
                >
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover && (
        <ChartTooltip
          x={hover.x}
          y={hover.y}
          value={`+${hover.node.record.additions}/-${hover.node.record.deletions}`}
          label={`${hover.node.path} — ${RISK_LABEL[hover.node.record.risk]}`}
        />
      )}
    </div>
  )
}
