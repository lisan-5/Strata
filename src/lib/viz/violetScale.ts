/**
 * Single-hue sequential scale, violet, tuned for a dark chart surface.
 * On dark backgrounds the anchor flips vs. light mode: the near-zero step
 * recedes toward the surface and the high-magnitude step is the brightest,
 * since a "darker" step would just disappear into the background.
 */
export const EMPTY_CELL_COLOR = 'rgba(255,255,255,0.06)'

/** Levels 1-4, lightness increasing monotonically. */
export const VIOLET_LEVELS = ['#3a2e5c', '#5b3fa0', '#7c3aed', '#c4b5fd'] as const

/** Buckets a raw count into 0 (empty) or 1-4, scaled against the max value in view. */
export function intensityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  const level = Math.ceil((count / max) * 4)
  return Math.min(4, Math.max(1, level)) as 1 | 2 | 3 | 4
}

export function intensityColor(count: number, max: number): string {
  const level = intensityLevel(count, max)
  return level === 0 ? EMPTY_CELL_COLOR : VIOLET_LEVELS[level - 1]
}
