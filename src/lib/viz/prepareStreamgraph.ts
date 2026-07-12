import type { ContributorStats } from '../github/stats'
import { CATEGORICAL_DARK, OTHER_COLOR } from './categoricalPalette'

export interface StreamSeries {
  key: string
  color: string
}

export type StreamPoint = { week: number } & Record<string, number>

export interface StreamgraphData {
  points: StreamPoint[]
  series: StreamSeries[]
}

const TOP_N = CATEGORICAL_DARK.length

/**
 * Top N contributors by total commits get their own categorical series;
 * everyone else folds into "Other" rather than generating more hues (an
 * (n+1)th color would be indistinguishable from an existing one under CVD).
 */
export function prepareStreamgraph(contributors: ContributorStats[]): StreamgraphData {
  const named = contributors.filter((c) => c.author !== null)
  const sorted = [...named].sort((a, b) => b.total - a.total)
  const top = sorted.slice(0, TOP_N)
  const rest = sorted.slice(TOP_N)

  const series: StreamSeries[] = top.map((c, i) => ({
    key: c.author!.login,
    color: CATEGORICAL_DARK[i],
  }))
  if (rest.length > 0) {
    series.push({ key: 'Other', color: OTHER_COLOR })
  }

  const weekSet = new Set<number>()
  for (const c of named) {
    for (const week of c.weeks) weekSet.add(week.w)
  }
  const weeks = [...weekSet].sort((a, b) => a - b)

  const points: StreamPoint[] = weeks.map((week) => {
    const point = { week } as StreamPoint
    for (const s of series) point[s.key] = 0
    return point
  })
  const pointByWeek = new Map(points.map((p) => [p.week, p]))

  for (const c of top) {
    for (const week of c.weeks) {
      const point = pointByWeek.get(week.w)
      if (point) point[c.author!.login] += week.c
    }
  }
  for (const c of rest) {
    for (const week of c.weeks) {
      const point = pointByWeek.get(week.w)
      if (point) point.Other += week.c
    }
  }

  return { points, series }
}
