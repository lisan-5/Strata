# Strata

Paste a GitHub repo URL. Strata excavates its entire life: activity
heatmaps and punch cards, contributor streamgraphs, file-churn treemaps
with bus-factor warnings, commit-message culture analysis, and
**era detection** — automatically segmenting a repo's history into named
phases.

No backend, no database. Everything runs client-side against the GitHub
REST API and is deployed as a static site.

## Status

Early build. This project is being built incrementally in public — see
commit history for progress.

## Stack

- Vite + React + TypeScript
- D3 for data math, React for rendering, canvas for anything over ~5k
  elements
- Web Workers for any loop over raw commit data
- Tailwind CSS

## Local development

```bash
npm install
npm run dev
```

## Engineering notes

_Filled in as each hard problem gets solved — GitHub's rate limits, the
`202` stats-endpoint dance, keeping aggregation off the main thread, and
repos whose history lies (forks, squash-merges, single-dump imports)._
