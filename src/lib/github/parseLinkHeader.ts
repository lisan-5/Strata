/** Parses a GitHub `Link` response header into a map of rel -> URL. */
export function parseLinkHeader(header: string | null): Record<string, string> {
  if (!header) return {}
  const links: Record<string, string> = {}
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match) links[match[2]] = match[1]
  }
  return links
}
