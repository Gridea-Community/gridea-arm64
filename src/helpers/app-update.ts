import axios from 'axios'

const repository = 'https://github.com/Gridea-Community/gridea-arm64'
export const releasesAPI = 'https://api.github.com/repos/Gridea-Community/gridea-arm64/releases'

export function parseVersion(value: string): number[] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)-arm64\.(\d+)(?:\.(alpha|beta)\.(\d+(?:\.\d+)*))?$/.exec(value)
  if (!match) return null
  const numbers = [...match.slice(1, 5).map(Number), match[5] === 'alpha' ? 0 : match[5] === 'beta' ? 1 : 2, ...(match[6] || '').split('.').filter(Boolean).map(Number)]
  return numbers.every(Number.isSafeInteger) ? numbers : null
}

export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0) ? 1 : -1
  }
  return 0
}

export function selectUpdate(releases: any[], current: string): { version: string; body: string; url: string } | null {
  const installed = parseVersion(current)
  if (!installed) throw new Error('Unsupported installed version')
  let selected: ReturnType<typeof selectUpdate> = null
  let newest = installed
  for (const release of releases) {
    if (!release || release.draft || typeof release.tag_name !== 'string') continue
    const candidate = parseVersion(release.tag_name)
    // Local Alpha builds are never offered. Stable builds stay on stable releases.
    if (!candidate || candidate[4] === 0 || (installed[4] === 2 && (candidate[4] !== 2 || release.prerelease))) continue
    if (!Array.isArray(release.assets) || !release.assets.some((asset: any) => asset?.name === `Gridea-for-ARM64-${release.tag_name.replace(/^v/, '')}.zip`)) continue
    if (compareVersions(candidate, newest) <= 0) continue
    newest = candidate
    selected = { version: release.tag_name, body: typeof release.body === 'string' ? release.body : '', url: `${repository}/releases/tag/${encodeURIComponent(release.tag_name)}` }
  }
  return selected
}

export function isUpdateRateLimited(error: unknown): boolean {
  const response = (error as any)?.response
  if (response?.status === 429) return true
  if (response?.status !== 403) return false
  const headers = response.headers || {}
  return String(headers['x-ratelimit-remaining']) === '0'
    || Boolean(headers['retry-after'])
    || /rate limit|secondary rate|abuse detection/i.test(String(response.data?.message || ''))
}

export async function checkForUpdate(current: string) {
  const releases: any[] = []
  for (let page = 1; page <= 10; page += 1) {
    const response = await axios.get(releasesAPI, { params: { per_page: 100, page }, timeout: 12000, headers: { Accept: 'application/vnd.github+json' } })
    if (!Array.isArray(response.data)) throw new Error('Invalid release response')
    releases.push(...response.data)
    if (response.data.length < 100) return selectUpdate(releases, current)
  }
  throw new Error('Release history exceeds lookup limit')
}
