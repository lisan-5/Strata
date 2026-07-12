import type { BasicCommitStats, WorkerRequest, WorkerResponse } from './commitAnalysis.types'
import type { CommitSummary } from '../lib/github/commits'

function computeBasicStats(commits: CommitSummary[]): BasicCommitStats {
  const authorCounts = new Map<string, number>()
  let firstDate: string | null = null
  let lastDate: string | null = null

  for (const commit of commits) {
    const author = commit.authorLogin ?? commit.authorName
    authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1)

    if (commit.authorDate) {
      if (!firstDate || commit.authorDate < firstDate) firstDate = commit.authorDate
      if (!lastDate || commit.authorDate > lastDate) lastDate = commit.authorDate
    }
  }

  const commitsPerAuthor = [...authorCounts.entries()]
    .map(([author, count]) => ({ author, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalCommits: commits.length,
    uniqueAuthors: authorCounts.size,
    firstCommitDate: firstDate,
    lastCommitDate: lastDate,
    commitsPerAuthor,
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data

  switch (request.type) {
    case 'basic-stats': {
      const result = computeBasicStats(request.commits)
      const response: WorkerResponse = { type: 'basic-stats', result }
      self.postMessage(response)
      break
    }
  }
}
