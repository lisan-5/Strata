import type {
  BasicCommitStats,
  FileChurnRecord,
  FileCommit,
  MessageCultureResult,
  WorkerRequest,
  WorkerResponse,
} from './commitAnalysis.types'
import type { CommitSummary } from '../lib/github/commits'

let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./commitAnalysis.worker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

function sendRequest(request: WorkerRequest): Promise<WorkerResponse> {
  return new Promise((resolve, reject) => {
    const w = getWorker()
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === request.type) {
        w.removeEventListener('message', handleMessage)
        resolve(event.data)
      }
    }
    w.addEventListener('message', handleMessage)
    w.addEventListener(
      'error',
      (event) => {
        w.removeEventListener('message', handleMessage)
        reject(new Error(event.message))
      },
      { once: true },
    )
    w.postMessage(request)
  })
}

export async function computeBasicStats(commits: CommitSummary[]): Promise<BasicCommitStats> {
  const response = await sendRequest({ type: 'basic-stats', commits })
  return (response as { type: 'basic-stats'; result: BasicCommitStats }).result
}

export async function computeFileChurn(
  commits: CommitSummary[],
  fileCommits: FileCommit[],
): Promise<FileChurnRecord[]> {
  const response = await sendRequest({ type: 'file-churn', commits, fileCommits })
  return (response as { type: 'file-churn'; result: FileChurnRecord[] }).result
}

export async function computeMessageCulture(commits: CommitSummary[]): Promise<MessageCultureResult> {
  const response = await sendRequest({ type: 'message-culture', commits })
  return (response as { type: 'message-culture'; result: MessageCultureResult }).result
}
