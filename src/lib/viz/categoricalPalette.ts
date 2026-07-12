/** Fixed hue order, dark-surface steps. Never cycled — an overflow series folds into "Other". */
export const CATEGORICAL_DARK = [
  '#3987e5', // blue
  '#199e70', // aqua
  '#c98500', // yellow
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
  '#d55181', // magenta
  '#d95926', // orange
] as const

/** Neutral, deliberately outside the categorical set — signals "not a real identity". */
export const OTHER_COLOR = '#4b5563'
