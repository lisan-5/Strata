export class GithubApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GithubApiError'
    this.status = status
  }
}

export class RateLimitExceededError extends GithubApiError {
  /** Epoch seconds when the rate limit window resets, if known. */
  resetAt: number | null

  constructor(resetAt: number | null) {
    super('GitHub API rate limit exceeded', 403)
    this.name = 'RateLimitExceededError'
    this.resetAt = resetAt
  }
}

export class NotFoundError extends GithubApiError {
  constructor(message = 'Repository not found') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}
