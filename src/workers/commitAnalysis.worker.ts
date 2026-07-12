import type {
  BasicCommitStats,
  BusFactorRisk,
  FileChurnRecord,
  FileCommit,
  WorkerRequest,
  WorkerResponse,
} from './commitAnalysis.types'
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

function classifyRisk(authorCount: number): BusFactorRisk {
  if (authorCount <= 1) return 'single-owner'
  if (authorCount === 2) return 'concentrated'
  return 'distributed'
}

function computeFileChurn(commits: CommitSummary[], fileCommits: FileCommit[]): FileChurnRecord[] {
  const authorBySha = new Map(commits.map((c) => [c.sha, c.authorLogin ?? c.authorName]))
  const perFile = new Map<
    string,
    { additions: number; deletions: number; touches: number; authors: Set<string> }
  >()

  for (const commit of fileCommits) {
    const author = authorBySha.get(commit.sha) ?? 'unknown'
    for (const file of commit.files) {
      let entry = perFile.get(file.filename)
      if (!entry) {
        entry = { additions: 0, deletions: 0, touches: 0, authors: new Set() }
        perFile.set(file.filename, entry)
      }
      entry.additions += file.additions
      entry.deletions += file.deletions
      entry.touches += 1
      entry.authors.add(author)
    }
  }

  return [...perFile.entries()]
    .map(([path, entry]) => ({
      path,
      additions: entry.additions,
      deletions: entry.deletions,
      churn: entry.additions + entry.deletions,
      touches: entry.touches,
      authorCount: entry.authors.size,
      risk: classifyRisk(entry.authors.size),
    }))
    .sort((a, b) => b.churn - a.churn)
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
    case 'file-churn': {
      const result = computeFileChurn(request.commits, request.fileCommits)
      const response: WorkerResponse = { type: 'file-churn', result }
      self.postMessage(response)
      break
    }
  }
}
