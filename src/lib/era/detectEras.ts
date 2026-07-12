import type { ContributorStats } from '../github/stats'

export interface Era {
  startWeek: number
  endWeek: number
  label: string
  description: string
  totalCommits: number
  weekCount: number
  topContributors: { author: string; count: number }[]
  isDormant: boolean
}

interface WeekBucket {
  week: number
  totalCommits: number
  authorCommits: Map<string, number>
}

interface Window {
  startIndex: number
  endIndex: number // exclusive
  startWeek: number
  endWeek: number
  totalCommits: number
  authorCommits: Map<string, number>
  isDormant: boolean
  topAuthor: string | null
  topShare: number
  activityBand: number
}

type Character = { key: 'dormant' | 'trickle' | 'led' | 'community' | 'mixed'; person: string | null }

// A 6-week window is long enough that a single busy or quiet week can't
// spawn its own era, but short enough to catch a real multi-month phase shift.
const WINDOW_WEEKS = 6
const WEEK_SECONDS = 7 * 24 * 60 * 60

// Automated accounts shouldn't read as a human "taking over" a project's leadership.
function isBot(author: string): boolean {
  return author.endsWith('[bot]') || author === 'unknown'
}

function buildWeeklyTimeline(contributors: ContributorStats[]): WeekBucket[] {
  const byWeek = new Map<number, Map<string, number>>()

  for (const contributor of contributors) {
    const author = contributor.author?.login ?? 'unknown'
    for (const week of contributor.weeks) {
      if (week.c === 0) continue
      let authors = byWeek.get(week.w)
      if (!authors) {
        authors = new Map()
        byWeek.set(week.w, authors)
      }
      authors.set(author, (authors.get(author) ?? 0) + week.c)
    }
  }

  if (byWeek.size === 0) return []

  const allWeeks = [...byWeek.keys()].sort((a, b) => a - b)
  const firstWeek = allWeeks[0]
  const lastWeek = allWeeks[allWeeks.length - 1]

  const timeline: WeekBucket[] = []
  for (let w = firstWeek; w <= lastWeek; w += WEEK_SECONDS) {
    const authorCommits = byWeek.get(w) ?? new Map<string, number>()
    let totalCommits = 0
    for (const count of authorCommits.values()) totalCommits += count
    timeline.push({ week: w, totalCommits, authorCommits })
  }

  return timeline
}

/** Turns a raw count into a coarse bucket index so week-to-week noise can't cross a boundary. */
function bandOf(value: number, edges: number[]): number {
  let band = 0
  for (const edge of edges) {
    if (value >= edge) band += 1
  }
  return band
}

function buildWindows(timeline: WeekBucket[]): Window[] {
  const windows: Window[] = []

  for (let start = 0; start < timeline.length; start += WINDOW_WEEKS) {
    const end = Math.min(start + WINDOW_WEEKS, timeline.length)
    const slice = timeline.slice(start, end)

    const authorCommits = new Map<string, number>()
    let totalCommits = 0
    for (const bucket of slice) {
      totalCommits += bucket.totalCommits
      for (const [author, count] of bucket.authorCommits) {
        authorCommits.set(author, (authorCommits.get(author) ?? 0) + count)
      }
    }

    // Bots are excluded from leadership attribution (but still count toward totals) —
    // a dependency-bump bot shouldn't read as a human "taking over" the project.
    let topAuthor: string | null = null
    let topCount = 0
    for (const [author, count] of authorCommits) {
      if (isBot(author)) continue
      if (count > topCount) {
        topCount = count
        topAuthor = author
      }
    }

    windows.push({
      startIndex: start,
      endIndex: end,
      startWeek: slice[0].week,
      endWeek: slice[slice.length - 1].week,
      totalCommits,
      authorCommits,
      isDormant: totalCommits === 0,
      topAuthor,
      topShare: totalCommits > 0 ? topCount / totalCommits : 0,
      activityBand: bandOf(totalCommits / slice.length, [2, 10, 30]),
    })
  }

  return windows
}

/** Leadership character is the grouping key — intensity alone never splits an era. */
function classifyWindow(window: Window): Character {
  if (window.isDormant) return { key: 'dormant', person: null }
  if (window.activityBand === 0) return { key: 'trickle', person: null }
  if (window.topShare >= 0.6) return { key: 'led', person: window.topAuthor }
  const humanContributorCount = [...window.authorCommits.keys()].filter((a) => !isBot(a)).length
  if (humanContributorCount >= 6) return { key: 'community', person: null }
  return { key: 'mixed', person: null }
}

function sameCharacter(a: Character, b: Character): boolean {
  return a.key === b.key && a.person === b.person
}

interface PooledStats {
  totalCommits: number
  weekCount: number
  isDormant: boolean
  topAuthor: string | null
  topShare: number
  humanContributorCount: number
  avgPerWeek: number
  topContributors: { author: string; count: number }[]
}

function poolStats(group: Window[]): PooledStats {
  const totalCommits = group.reduce((sum, w) => sum + w.totalCommits, 0)
  const weekCount = group.reduce((sum, w) => sum + (w.endIndex - w.startIndex), 0)

  const authorCommits = new Map<string, number>()
  for (const w of group) {
    for (const [author, count] of w.authorCommits) {
      authorCommits.set(author, (authorCommits.get(author) ?? 0) + count)
    }
  }

  const topContributors = [...authorCommits.entries()]
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)

  const humanRanked = topContributors.filter((c) => !isBot(c.author))
  const [top] = humanRanked

  return {
    totalCommits,
    weekCount,
    isDormant: totalCommits === 0,
    topAuthor: top?.author ?? null,
    topShare: totalCommits > 0 ? (top?.count ?? 0) / totalCommits : 0,
    humanContributorCount: humanRanked.length,
    avgPerWeek: totalCommits / weekCount,
    topContributors: topContributors.slice(0, 5),
  }
}

/** Final character used for the post-merge consolidation pass, from pooled (not per-window) stats. */
function pooledCharacterKey(stats: PooledStats, overallAvgPerWeek: number): string {
  if (stats.isDormant) return 'dormant'
  if (stats.avgPerWeek < overallAvgPerWeek * 0.5 && stats.avgPerWeek < 2) return 'slow'
  if (stats.topShare >= 0.5) return `led:${stats.topAuthor}`
  return 'community'
}

function nameEra(stats: PooledStats, overallAvgPerWeek: number): { label: string; description: string } {
  if (stats.isDormant) {
    return { label: 'Dormant', description: `No commits for ${stats.weekCount} weeks` }
  }

  const highVelocity = stats.avgPerWeek > overallAvgPerWeek * 1.5

  if (stats.avgPerWeek < overallAvgPerWeek * 0.5 && stats.avgPerWeek < 2) {
    return { label: 'Slow maintenance', description: `Averaging ${stats.avgPerWeek.toFixed(1)} commits/week` }
  }

  if (stats.topShare >= 0.5 && stats.topAuthor) {
    return {
      label: `${stats.topAuthor}'s era${highVelocity ? ' (high-velocity)' : ''}`,
      description: `${stats.topAuthor} leads, ${stats.avgPerWeek.toFixed(1)} commits/week`,
    }
  }

  return {
    label: `Community era${highVelocity ? ' (high-velocity)' : ''}`,
    description: `${stats.humanContributorCount} contributors, ${stats.avgPerWeek.toFixed(1)} commits/week`,
  }
}

/**
 * Segments a repo's full commit history into named eras from the weekly
 * per-contributor stats (already fetched, covers the whole repo lifetime —
 * unlike the capped raw-commit sample). Three passes:
 *  1. Group adjacent 6-week windows sharing the same leadership character.
 *  2. Absorb short non-dormant flickers into a neighbor (floor scales with
 *     the repo's total lifetime) so a handful of noisy weeks can't become
 *     their own "era".
 *  3. Merge adjacent groups that land on the same final character — a brief
 *     blip absorbed into different neighbors can otherwise split one
 *     continuous phase into duplicate-looking entries.
 */
export function detectEras(contributors: ContributorStats[]): Era[] {
  const timeline = buildWeeklyTimeline(contributors)
  if (timeline.length === 0) return []

  const windows = buildWindows(timeline)
  const overallTotal = timeline.reduce((sum, w) => sum + w.totalCommits, 0)
  const overallAvgPerWeek = overallTotal / timeline.length

  let groups: Window[][] = []
  for (const window of windows) {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && sameCharacter(classifyWindow(lastGroup[lastGroup.length - 1]), classifyWindow(window))) {
      lastGroup.push(window)
    } else {
      groups.push([window])
    }
  }

  const totalWeeks = timeline.length
  const minEraWeeks = Math.min(26, Math.max(8, Math.round(totalWeeks * 0.04)))

  let mergedShort = true
  while (mergedShort) {
    mergedShort = false
    for (let i = 0; i < groups.length; i++) {
      const stats = poolStats(groups[i])
      if (stats.isDormant || stats.weekCount >= minEraWeeks || groups.length === 1) continue
      if (i < groups.length - 1) {
        groups[i] = [...groups[i], ...groups[i + 1]]
        groups.splice(i + 1, 1)
      } else {
        groups[i - 1] = [...groups[i - 1], ...groups[i]]
        groups.splice(i, 1)
      }
      mergedShort = true
      break
    }
  }

  let consolidated = true
  while (consolidated) {
    consolidated = false
    for (let i = 0; i < groups.length - 1; i++) {
      const a = pooledCharacterKey(poolStats(groups[i]), overallAvgPerWeek)
      const b = pooledCharacterKey(poolStats(groups[i + 1]), overallAvgPerWeek)
      if (a === b) {
        groups[i] = [...groups[i], ...groups[i + 1]]
        groups.splice(i + 1, 1)
        consolidated = true
        break
      }
    }
  }

  return groups.map((group) => {
    const stats = poolStats(group)
    const { label, description } = nameEra(stats, overallAvgPerWeek)
    return {
      startWeek: group[0].startWeek,
      endWeek: group[group.length - 1].endWeek,
      label,
      description,
      totalCommits: stats.totalCommits,
      weekCount: stats.weekCount,
      topContributors: stats.topContributors,
      isDormant: stats.isDormant,
    }
  })
}
