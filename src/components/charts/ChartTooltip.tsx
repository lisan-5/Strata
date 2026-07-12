interface ChartTooltipProps {
  x: number
  y: number
  value: string
  label: string
}

/** Fixed-position hover tooltip: value leads (high-contrast), label follows (secondary). */
export function ChartTooltip({ x, y, value, label }: ChartTooltipProps) {
  return (
    <div
      className="pointer-events-none fixed z-20 -translate-x-1/2 -translate-y-full rounded-md border border-white/10 bg-[#12141b] px-2.5 py-1.5 text-xs shadow-xl"
      style={{ left: x, top: y - 8 }}
    >
      <div className="font-mono font-semibold text-slate-100">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  )
}
