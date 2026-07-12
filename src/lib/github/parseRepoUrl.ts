export interface RepoRef {
  owner: string
  repo: string
}

const GITHUB_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+?)(?:\.git)?\/?(?:[#?].*)?$/

const SHORTHAND_PATTERN = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]+)$/

export function parseRepoUrl(input: string): RepoRef | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const urlMatch = trimmed.match(GITHUB_URL_PATTERN)
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] }
  }

  const shorthandMatch = trimmed.match(SHORTHAND_PATTERN)
  if (shorthandMatch) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2] }
  }

  return null
}
