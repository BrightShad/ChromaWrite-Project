/** Scene row persisted with story — insertedAt = character index in full text before the image */
export type SceneImageEntry = {
  url: string
  mood: string
  timestamp: number
  insertedAt: number
}

/** Old saves without insertedAt — infer boundaries so split layout still works */
export function migrateLegacySceneGallery(
  content: string,
  gallery: Array<{ url: string; mood: string; timestamp: number; insertedAt?: number }>
): SceneImageEntry[] {
  if (!gallery.length) return []
  const hasAll = gallery.every(g => typeof g.insertedAt === 'number')
  if (hasAll) return [...(gallery as SceneImageEntry[])].sort((a, b) => a.insertedAt - b.insertedAt)
  const n = gallery.length
  if (n === 1) {
    return [{ ...gallery[0], insertedAt: content.length }]
  }
  const inferred = gallery.map((g, i) => ({
    ...g,
    insertedAt: Math.floor((content.length * (i + 1)) / (n + 1)),
  }))
  return inferred.sort((a, b) => a.insertedAt - b.insertedAt)
}

export function splitSegments(content: string, images: SceneImageEntry[]): string[] {
  if (!images.length) return [content]
  const sorted = [...images].sort((a, b) => a.insertedAt - b.insertedAt)
  const segs: string[] = []
  let start = 0
  for (const img of sorted) {
    const end = Math.min(img.insertedAt, content.length)
    segs.push(content.slice(start, end))
    start = end
  }
  segs.push(content.slice(start))
  return segs
}

export function joinSegments(segments: string[]): string {
  return segments.join('')
}

/** insertedAt[i] = index after segment i (before image i) */
export function insertedAtFromSegments(segments: string[]): number[] {
  const out: number[] = []
  let pos = 0
  for (let i = 0; i < segments.length - 1; i++) {
    pos += segments[i].length
    out.push(pos)
  }
  return out
}

