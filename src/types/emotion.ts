// ─── Emotion Types ────────────────────────────────────────────────────────────

export const PRIMARY_EMOTIONS = [
  'Anger', 'Enraged', 'Jealous', 'Resentful', 'Exasperated', 'Irritable', 'Annoyed', 'Aggravated',
  'Disgust', 'Revolted', 'Disappointed', 'Nauseated', 'Disapproving', 'Contemptuous', 'Disrespectful', 'Scornful',
  'Fear', 'Terrified', 'Panicked', 'Horrified', 'Insecure', 'Nervous', 'Anxious', 'Worried',
  'Happiness', 'Content', 'Elated', 'Proud', 'Excited', 'Cheerful', 'Playful', 'Optimistic', 'Nostalgic',
  'Surprise', 'Startled', 'Amazed', 'Stunned', 'Moved', 'Confused', 'Disillusioned', 'Perplexed',
  'Sadness', 'Hurt', 'Mournful', 'Depressed', 'Lonely', 'Ashamed', 'Guilty', 'Regretful',
] as const

export type PrimaryEmotion = (typeof PRIMARY_EMOTIONS)[number]

export type EmotionSource = 'picker' | 'custom' | 'neutral' | 'detected'

export interface EmotionColour {
  hex: string
  rgb: [number, number, number]
  /** css filter saturation multiplier 0–1, driven by confidence */
  saturation: number
}

export interface EmotionScore {
  emotion: PrimaryEmotion
  score: number        // 0–100 normalised
  confidence: number   // 0–1
}

export interface DetectionResult {
  /** Top emotion this cycle */
  dominant: PrimaryEmotion
  /** All scores for this cycle, sorted descending */
  scores: EmotionScore[]
  /** True when top two emotions are within 20 pts → blend mode */
  isConflict: boolean
  /** Up to 3 emotions above threshold for triple-blend */
  blendEmotions: PrimaryEmotion[]
  /** 0–1 confidence of dominant pick */
  confidence: number
  /** Word offset this cycle fired at */
  wordOffset: number
  /** Whether this came from local scorer or API */
  source: 'local' | 'api'
}

export interface ArcPoint {
  wordOffset: number
  dominant: PrimaryEmotion
  blendEmotions: PrimaryEmotion[]
  confidence: number
  timestamp: number
}

export interface CustomEmotionMapping {
  rawLabel: string
  mappedTo: PrimaryEmotion
  confidence: number   // drives saturation
  source: 'api'
}

export interface SessionState {
  storyId: string
  title: string
  startingEmotion: PrimaryEmotion | 'neutral' | CustomEmotionMapping
  currentDominant: PrimaryEmotion | null
  currentBlend: PrimaryEmotion[]
  arc: ArcPoint[]
  wordCount: number
  cycleCount: number
  /** consecutive cycles with same dominant — triggers Tier 1 suggestion at 5 */
  flatlineCount: number
  imageBarCharge: number   // 0–100
  prompterBarCharge: number // 0–100
  suggestions: Suggestion[]
}

export type SuggestionTier = 1 | 2 | 3

export interface Suggestion {
  id: string
  tier: SuggestionTier
  message: string
  emotion?: PrimaryEmotion
  timestamp: number
  dismissed: boolean
}
