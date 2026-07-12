import type {
  BasicCommitStats,
  BusFactorRisk,
  FileChurnRecord,
  FileCommit,
  MessageCultureResult,
  WorkerRequest,
  WorkerResponse,
} from './commitAnalysis.types'
import type { CommitSummary } from '../lib/github/commits'

const CONVENTIONAL_TYPES = new Set([
  'feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'revert',
])
const CONVENTIONAL_PATTERN = /^([a-zA-Z]+)(\([^)]*\))?!?:\s*(.*)$/
const EMOJI_PATTERN = /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u

function firstLine(message: string): string {
  return message.split('\n')[0].trim()
}

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

function computeMessageCulture(commits: CommitSummary[]): MessageCultureResult {
  const typeCounts = new Map<string, number>()
  const wordCounts = new Map<string, number>()
  let conventionalCount = 0
  let emojiCount = 0
  let fixupCount = 0
  let totalSubjectLength = 0

  for (const commit of commits) {
    const subject = firstLine(commit.message)
    totalSubjectLength += subject.length

    if (EMOJI_PATTERN.test(subject)) emojiCount += 1

    const lower = subject.toLowerCase()
    if (lower.startsWith('wip') || lower.startsWith('fixup!') || lower.startsWith('squash!')) {
      fixupCount += 1
    }

    const match = subject.match(CONVENTIONAL_PATTERN)
    let rest = subject
    if (match && CONVENTIONAL_TYPES.has(match[1].toLowerCase())) {
      conventionalCount += 1
      const type = match[1].toLowerCase()
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
      rest = match[3]
    } else {
      typeCounts.set('other', (typeCounts.get('other') ?? 0) + 1)
    }

    const firstWord = rest.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '')
    if (firstWord && firstWord.length > 1) {
      wordCounts.set(firstWord, (wordCounts.get(firstWord) ?? 0) + 1)
    }
  }

  const total = commits.length || 1

  return {
    totalMessages: commits.length,
    conventionalCommitRate: conventionalCount / total,
    typeBreakdown: [...typeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    averageSubjectLength: totalSubjectLength / total,
    emojiRate: emojiCount / total,
    fixupRate: fixupCount / total,
    topLeadingWords: [...wordCounts.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
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
    case 'file-churn': {
      const result = computeFileChurn(request.commits, request.fileCommits)
      const response: WorkerResponse = { type: 'file-churn', result }
      self.postMessage(response)
      break
    }
    case 'message-culture': {
      const result = computeMessageCulture(request.commits)
      const response: WorkerResponse = { type: 'message-culture', result }
      self.postMessage(response)
      break
    }
  }
}
