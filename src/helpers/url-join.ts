import join from 'url-join'

// url-join 6 drops a final standalone slash. Keep existing post/tag URL shapes.
export default function urlJoin(...parts: string[]): string {
  const result = join(...parts)
  const last = parts.filter(part => part !== '').slice(-1)[0]
  if (last && /^\/+$/u.test(last) && result && !result.endsWith('/') && !/[?#]/u.test(result)) {
    return `${result}/`
  }
  return result
}
