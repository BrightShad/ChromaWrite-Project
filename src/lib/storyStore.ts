// ─── Story Store ──────────────────────────────────────────────────────────────
// Supabase-first with localStorage fallback.
// If Supabase is configured → real database, synced across devices.
// If not → localStorage (works perfectly for demo/local dev).

import { supabase, isSupabaseReady } from './supabase'

export interface StoredStory {
  id: string
  title: string
  snippet: string
  mood: string
  moodColor: string
  moodClass: string
  wordCount: number
  lastEdited: string
  chromaticArc: string[]
  content: string
  fingerprint?: string
  createdAt: number
  userId?: string
  // Session continuity
  elapsedMinutes?: number
  savedArcPoints?: Array<{ dominant: string; confidence: number; wordOffset: number; timestamp: number }>
  /** Generated scene images — insertedAt = char index in full story text before image */
  sceneGallery?: Array<{ url: string; mood: string; timestamp: number; insertedAt?: number }>
  coverImage?: string
}

// ─── Mood metadata ────────────────────────────────────────────────────────────

const MOOD_META: Record<string, { moodClass: string; moodColor: string; arcColors: string[] }> = {
  Anger:     { moodClass: 'mood-tension',    moodColor: 'hsl(5 70% 45%)',    arcColors: ['hsl(5,70%,45%)',  'hsl(0,65%,40%)',   'hsl(10,60%,42%)',  'hsl(5,70%,48%)'] },
  Disgust:   { moodClass: 'mood-serenity',   moodColor: 'hsl(90 30% 45%)',   arcColors: ['hsl(90,30%,45%)', 'hsl(85,25%,40%)',  'hsl(100,35%,42%)', 'hsl(90,30%,48%)'] },
  Fear:      { moodClass: 'mood-melancholy', moodColor: 'hsl(270 30% 35%)',  arcColors: ['hsl(270,30%,35%)','hsl(260,25%,30%)', 'hsl(280,35%,38%)', 'hsl(270,30%,40%)'] },
  Happiness: { moodClass: 'mood-resolve',    moodColor: 'hsl(45 85% 55%)',   arcColors: ['hsl(45,85%,55%)', 'hsl(35,80%,50%)',  'hsl(50,80%,58%)',  'hsl(40,85%,52%)'] },
  Surprise:  { moodClass: 'mood-curiosity',  moodColor: 'hsl(174 65% 45%)',  arcColors: ['hsl(174,65%,45%)','hsl(165,60%,40%)', 'hsl(180,60%,48%)', 'hsl(174,65%,50%)'] },
  Sadness:   { moodClass: 'mood-melancholy', moodColor: 'hsl(220 40% 35%)',  arcColors: ['hsl(220,40%,35%)','hsl(210,35%,30%)', 'hsl(225,40%,38%)', 'hsl(215,35%,40%)'] },
}

export function getMoodMeta(mood: string) {
  return MOOD_META[mood] ?? MOOD_META['Happiness']
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  return `${Math.floor(days / 7)}w ago`
}

// ─── localStorage helpers (fallback) ─────────────────────────────────────────

const LS_KEY = 'chromawrite_stories'

function lsLoad(): StoredStory[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return getDefaultStories()
    return (JSON.parse(raw) as StoredStory[]).map(s => ({
      ...s, lastEdited: timeAgo(s.createdAt)
    }))
  } catch { return getDefaultStories() }
}

function lsSave(story: StoredStory): void {
  try {
    const all = lsLoad()
    const idx = all.findIndex(s => s.id === story.id)
    if (idx >= 0) all[idx] = story
    else all.unshift(story)
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch (e) { console.warn('[ChromaWrite] localStorage save failed', e) }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

// Maps our StoredStory to the Supabase table row shape
function toRow(s: StoredStory) {
  return {
    id:           s.id,
    title:        s.title,
    snippet:      s.snippet,
    mood:         s.mood,
    mood_color:   s.moodColor,
    mood_class:   s.moodClass,
    word_count:   s.wordCount,
    chromatic_arc: s.chromaticArc,
    content:      s.content,
    fingerprint:  s.fingerprint ?? null,
    created_at:   new Date(s.createdAt).toISOString(),
    user_id:      s.userId ?? null,
    elapsed_minutes: s.elapsedMinutes ?? 0,
    scene_gallery: s.sceneGallery?.length ? JSON.stringify(s.sceneGallery) : null,
  }
}

function fromRow(row: Record<string, unknown>): StoredStory {
  const createdAt = new Date(row.created_at as string).getTime()
  return {
    id:           row.id as string,
    title:        row.title as string,
    snippet:      row.snippet as string,
    mood:         row.mood as string,
    moodColor:    row.mood_color as string,
    moodClass:    row.mood_class as string,
    wordCount:    row.word_count as number,
    chromaticArc: row.chromatic_arc as string[],
    content:      row.content as string,
    fingerprint:  row.fingerprint as string | undefined,
    createdAt,
    lastEdited:   timeAgo(createdAt),
    userId:       row.user_id as string | undefined,
    elapsedMinutes: (row.elapsed_minutes as number | undefined) ?? undefined,
    savedArcPoints: undefined,
    sceneGallery: parseSceneGallery(row.scene_gallery),
  }
}

function parseSceneGallery(raw: unknown): StoredStory['sceneGallery'] {
  if (raw == null || raw === '') return undefined
  if (Array.isArray(raw)) return raw as StoredStory['sceneGallery']
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as StoredStory['sceneGallery']) : undefined
    } catch {
      return undefined
    }
  }
  return undefined
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadStories(userId?: string): Promise<StoredStory[]> {
  if (!isSupabaseReady || !supabase) return lsLoad()

  try {
    let query = supabase
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) query = query.eq('user_id', userId)

    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) return getDefaultStories()
    return data.map(row => fromRow(row as Record<string, unknown>))
  } catch (e) {
    console.warn('[ChromaWrite] Supabase load failed, using localStorage', e)
    return lsLoad()
  }
}

export async function saveStory(story: StoredStory): Promise<void> {
  // Always save to localStorage as immediate backup
  lsSave(story)

  if (!isSupabaseReady || !supabase) return

  try {
    const { error } = await supabase
      .from('stories')
      .upsert(toRow(story), { onConflict: 'id' })
    if (error) throw error
  } catch (e) {
    console.warn('[ChromaWrite] Supabase save failed, story kept in localStorage', e)
  }
}

export async function deleteStory(id: string): Promise<void> {
  // Remove from localStorage
  try {
    const all = lsLoad().filter(s => s.id !== id)
    localStorage.setItem(LS_KEY, JSON.stringify(all))
  } catch {}

  if (!isSupabaseReady || !supabase) return

  try {
    await supabase.from('stories').delete().eq('id', id)
  } catch (e) {
    console.warn('[ChromaWrite] Supabase delete failed', e)
  }
}

export async function updateStoryCover(id: string, coverUrl: string): Promise<void> {
  const stories = lsLoad()
  const idx = stories.findIndex(s => s.id === id)
  if (idx !== -1) {
    stories[idx].coverImage = coverUrl
    localStorage.setItem(LS_KEY, JSON.stringify(stories))
  }

  if (!isSupabaseReady || !supabase) return

  try {
    await supabase.from('stories').update({ cover_image: coverUrl }).eq('id', id)
  } catch (e) {
    console.warn('[ChromaWrite] Supabase cover update failed', e)
  }
}

export function buildStoryFromSession(params: {
  id: string
  title: string
  content: string
  mood: string
  wordCount: number
  arcColors?: string[]
  fingerprint?: string
  userId?: string
  elapsedMinutes?: number
  savedArcPoints?: StoredStory['savedArcPoints']
  sceneGallery?: StoredStory['sceneGallery']
  coverImage?: string
}): StoredStory {
  const meta = getMoodMeta(params.mood)
  const snippet = params.content.trim().slice(0, 160).replace(/\s+/g, ' ') + '...'
  return {
    id:           params.id,
    title:        params.title || 'Untitled',
    snippet,
    mood:         params.mood,
    moodColor:    meta.moodColor,
    moodClass:    meta.moodClass,
    wordCount:    params.wordCount,
    lastEdited:   'just now',
    chromaticArc: params.arcColors ?? meta.arcColors,
    content:      params.content,
    fingerprint:  params.fingerprint,
    createdAt:    Date.now(),
    userId:       params.userId,
    elapsedMinutes: params.elapsedMinutes ?? 0,
    savedArcPoints: params.savedArcPoints ?? [],
    sceneGallery: params.sceneGallery ?? [],
    coverImage:   params.coverImage,
  }
}

// ─── Default seed stories ─────────────────────────────────────────────────────

function getDefaultStories(): StoredStory[] {
  return [
    {
      id: 'seed_1', title: 'The Glass Shore', mood: 'Melancholy',
      moodClass: 'mood-melancholy', moodColor: 'hsl(270 40% 48%)',
      snippet: 'She walked until the sand turned to silence, each step a question the tide refused to answer...',
      wordCount: 1240, lastEdited: '2 hours ago', createdAt: Date.now() - 7200000,
      chromaticArc: ['hsl(270,40%,48%)', 'hsl(240,30%,40%)', 'hsl(200,35%,45%)', 'hsl(270,35%,42%)'],
      content: '',
    },
    {
      id: 'seed_2', title: 'Ember & Iron', mood: 'Resolve',
      moodClass: 'mood-resolve', moodColor: 'hsl(35 80% 52%)',
      snippet: 'The forge spoke in tongues of orange heat, and the blacksmith listened with hands that remembered fire...',
      wordCount: 890, lastEdited: 'Yesterday', createdAt: Date.now() - 86400000,
      chromaticArc: ['hsl(35,80%,52%)', 'hsl(20,60%,45%)', 'hsl(350,55%,42%)', 'hsl(35,70%,48%)'],
      content: '',
    },
    {
      id: 'seed_3', title: 'Quiet Machines', mood: 'Curiosity',
      moodClass: 'mood-curiosity', moodColor: 'hsl(174 50% 45%)',
      snippet: 'In the server room, something breathed that had no lungs. A hum like a lullaby for sleeping data...',
      wordCount: 2100, lastEdited: '3 days ago', createdAt: Date.now() - 259200000,
      chromaticArc: ['hsl(174,50%,45%)', 'hsl(190,40%,40%)', 'hsl(174,45%,50%)', 'hsl(200,35%,42%)'],
      content: '',
    },
    {
      id: 'seed_4', title: 'Red Letters', mood: 'Tension',
      moodClass: 'mood-tension', moodColor: 'hsl(350 55% 42%)',
      snippet: 'Every envelope she opened left a wound. Not the paper kind — the kind that rewrites your name...',
      wordCount: 560, lastEdited: '4 days ago', createdAt: Date.now() - 345600000,
      chromaticArc: ['hsl(350,55%,42%)', 'hsl(0,50%,38%)', 'hsl(340,45%,40%)', 'hsl(350,50%,45%)'],
      content: '',
    },
  ]
}
