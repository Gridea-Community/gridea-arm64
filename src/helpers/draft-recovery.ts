export interface DraftSnapshot {
  title: string
  content: string
  fileName: string
  tags: string[]
  date: string
  published: boolean
  hideInList: boolean
  isTop: boolean
  featureType: 'DEFAULT' | 'EXTERNAL'
  featureImage: { path: string, name: string, type: string }
  featureImagePath: string
  fileNameChanged: boolean
}

export function isDraftSnapshot(value: any): value is DraftSnapshot {
  return value && typeof value === 'object' &&
    ['title', 'content', 'fileName', 'date', 'featureImagePath'].every(key => typeof value[key] === 'string') &&
    ['published', 'hideInList', 'isTop', 'fileNameChanged'].every(key => typeof value[key] === 'boolean') &&
    Array.isArray(value.tags) && value.tags.every((tag: unknown) => typeof tag === 'string') &&
    (value.featureType === 'DEFAULT' || value.featureType === 'EXTERNAL') &&
    value.featureImage && ['path', 'name', 'type'].every(key => typeof value.featureImage[key] === 'string')
}

interface DraftTextChange {
  before: string
  after: string
}

export function draftTextChanges(before: string, after: string): DraftTextChange[] {
  if (before === after) return []
  const saved = before ? before.split('\n') : []
  const draft = after ? after.split('\n') : []
  let start = 0
  let savedEnd = saved.length
  let draftEnd = draft.length
  while (start < savedEnd && start < draftEnd && saved[start] === draft[start]) start++
  while (savedEnd > start && draftEnd > start && saved[savedEnd - 1] === draft[draftEnd - 1]) {
    savedEnd--
    draftEnd--
  }

  const width = draftEnd - start + 1
  const cells = (savedEnd - start + 1) * width
  // Bound work on unusually large edits while still omitting the common beginning and end.
  if (cells > 4_000_000) return [{ before: saved.slice(start, savedEnd).join('\n'), after: draft.slice(start, draftEnd).join('\n') }]

  const common = new Uint32Array(cells)
  for (let i = savedEnd - 1; i >= start; i--) {
    for (let j = draftEnd - 1; j >= start; j--) {
      const index = (i - start) * width + j - start
      common[index] = saved[i] === draft[j] ? common[index + width + 1] + 1 : Math.max(common[index + width], common[index + 1])
    }
  }

  const changes: DraftTextChange[] = []
  let i = start
  let j = start
  let removed: string[] = []
  let added: string[] = []
  const flush = () => {
    if (removed.length || added.length) changes.push({ before: removed.join('\n'), after: added.join('\n') })
    removed = []
    added = []
  }
  while (i < savedEnd || j < draftEnd) {
    const index = (i - start) * width + j - start
    if (i < savedEnd && j < draftEnd && saved[i] === draft[j]) {
      flush()
      i++
      j++
    } else if (i < savedEnd && (j === draftEnd || common[index + width] >= common[index + 1])) {
      removed.push(saved[i++])
    } else {
      added.push(draft[j++])
    }
  }
  flush()
  return changes
}
