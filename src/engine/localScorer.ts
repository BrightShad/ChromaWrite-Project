import type { PrimaryEmotion, EmotionScore, DetectionResult } from '../types/emotion'

// ─── Keyword Dictionary ────────────────────────────────────────────────────────
// Each entry: [keyword, weight]
// Weight 1 = base signal. 2 = strong signal. 3 = definitive marker.
// Negation handling strips keywords preceded by "not", "never", "no longer" etc.

type KeywordMap = Record<PrimaryEmotion, Array<[string, number]>>

const KEYWORDS: KeywordMap = {
  Anger: [
    ['anger', 3], ['angry', 2], ['rage', 3], ['fury', 2], ['furious', 2], ['mad', 3], ['hate', 3], ['hostil', 3], ['bitter', 2], ['outrage', 2]
  ],
  Enraged: [
    ['enrag', 2], ['seethe', 2], ['boil', 2]
  ],
  Jealous: [
    ['jealous', 2], ['envy', 2]
  ],
  Resentful: [
    ['resent', 2], ['spite', 2], ['grudge', 2]
  ],
  Exasperated: [
    ['exasperat', 2], ['weary', 2]
  ],
  Irritable: [
    ['irritab', 3], ['cranky', 3]
  ],
  Annoyed: [
    ['annoy', 3], ['bother', 3], ['pest', 2]
  ],
  Aggravated: [
    ['aggravat', 2], ['frustrat', 3]
  ],
  Disgust: [
    ['disgust', 2], ['sick', 3], ['gross', 3], ['foul', 2], ['distaste', 2], ['cringe', 3]
  ],
  Revolted: [
    ['revolt', 2], ['revulsion', 3], ['appall', 2]
  ],
  Disappointed: [
    ['disappoint', 3], ['let down', 2], ['dismay', 2]
  ],
  Nauseated: [
    ['nauseat', 2], ['queasy', 2], ['gag', 2]
  ],
  Disapproving: [
    ['disapprov', 2], ['frown', 2], ['judge', 3]
  ],
  Contemptuous: [
    ['contempt', 2], ['loath', 2]
  ],
  Disrespectful: [
    ['disrespect', 3], ['mock', 2]
  ],
  Scornful: [
    ['scorn', 3], ['sneer', 3]
  ],
  Fear: [
    ['fear', 2], ['afraid', 2], ['scared', 3], ['threat', 3], ['danger', 2]
  ],
  Terrified: [
    ['terrifi', 2], ['fright', 2], ['petrifi', 2]
  ],
  Panicked: [
    ['panic', 3], ['frantic', 3]
  ],
  Horrified: [
    ['horrif', 2], ['horror', 2]
  ],
  Insecure: [
    ['insecure', 2], ['doubt', 3], ['unsure', 3]
  ],
  Nervous: [
    ['nervous', 3], ['trembl', 3], ['shak', 3], ['jitter', 2]
  ],
  Anxious: [
    ['anxious', 3], ['tension', 3], ['stress', 2]
  ],
  Worried: [
    ['worried', 3], ['worry', 2]
  ],
  Happiness: [
    ['happ', 2], ['joy', 3], ['smile', 3], ['laugh', 3], ['glad', 2], ['peace', 2], ['warm', 2], ['bliss', 3]
  ],
  Content: [
    ['content', 2], ['satis', 3], ['peaceful', 2]
  ],
  Elated: [
    ['elat', 3], ['euphori', 3], ['fly', 3]
  ],
  Proud: [
    ['proud', 3], ['pride', 3], ['honor', 2]
  ],
  Excited: [
    ['excit', 3], ['thrill', 3], ['pump', 3]
  ],
  Cheerful: [
    ['cheerful', 2], ['cheer', 2], ['bright', 3]
  ],
  Playful: [
    ['playful', 2], ['fun', 2], ['joke', 3]
  ],
  Optimistic: [
    ['optimistic', 3], ['hopeful', 3], ['bright', 3]
  ],
  Nostalgic: [
    ['nostalgi', 2], ['memory', 2], ['past', 3], ['reminisc', 3]
  ],
  Surprise: [
    ['surpris', 2], ['sudden', 3], ['unexpected', 3], ['what', 3]
  ],
  Startled: [
    ['startle', 3], ['jump', 3], ['jolt', 2]
  ],
  Amazed: [
    ['amaz', 2], ['astound', 2], ['wonder', 2]
  ],
  Stunned: [
    ['stun', 3], ['dumbfound', 2], ['speechless', 3]
  ],
  Moved: [
    ['moved', 2], ['touch', 2]
  ],
  Confused: [
    ['confus', 2], ['baffle', 2]
  ],
  Disillusioned: [
    ['disillusion', 3], ['cynical', 2]
  ],
  Perplexed: [
    ['perplex', 3], ['puzzle', 2]
  ],
  Sadness: [
    ['sad', 2], ['sadness', 2], ['cry', 3], ['tear', 3], ['weep', 2], ['sorrow', 3], ['loss', 2], ['lost', 2], ['gloom', 2]
  ],
  Hurt: [
    ['hurt', 2], ['pain', 2], ['ache', 2], ['wound', 3]
  ],
  Mournful: [
    ['mourn', 2], ['grief', 2], ['tragic', 3]
  ],
  Depressed: [
    ['depress', 2], ['despair', 3], ['heavy', 2]
  ],
  Lonely: [
    ['lonely', 3], ['alone', 2], ['isolat', 3]
  ],
  Ashamed: [
    ['ashamed', 3], ['shame', 2], ['embarrass', 3]
  ],
  Guilty: [
    ['guilt', 3], ['fault', 3], ['blame', 2]
  ],
  Regretful: [
    ['regret', 3], ['wish', 3]
  ],
}

// ─── Negation Words ───────────────────────────────────────────────────────────

const NEGATION_WORDS = [
  'not', 'never', 'no', 'without', 'lack', 'none',
  'hardly', 'barely', "n't", 'no longer', 'nothing',
]

// ─── Scorer ───────────────────────────────────────────────────────────────────

const CONFLICT_THRESHOLD = 20   // pts — within this → blend
const BLEND_MIN_SCORE    = 15   // minimum score to enter a blend
const CYCLE_WORDS        = 15   // words per detection cycle — more responsive

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[—–]/g, ' ')
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function isNegated(tokens: string[], matchIndex: number): boolean {
  const window = tokens.slice(Math.max(0, matchIndex - 3), matchIndex)
  return window.some(t => NEGATION_WORDS.includes(t))
}

function scoreText(tokens: string[]): Record<PrimaryEmotion, number> {
  const raw: Record<string, number> = {}
  for (const emotion of Object.keys(KEYWORDS) as PrimaryEmotion[]) {
    raw[emotion] = 0
  }

  const joined = tokens.join(' ')

  for (const [emotion, pairs] of Object.entries(KEYWORDS) as [PrimaryEmotion, Array<[string, number]>][]) {
    for (const [keyword, weight] of pairs) {
      // Find all occurrences
      let searchFrom = 0
      while (true) {
        const idx = joined.indexOf(keyword, searchFrom)
        if (idx === -1) break
        // Rough token index
        const tokensBefore = joined.slice(0, idx).split(' ').length
        if (!isNegated(tokens, tokensBefore)) {
          raw[emotion] += weight
        }
        searchFrom = idx + keyword.length
      }
    }
  }

  return raw as Record<PrimaryEmotion, number>
}

function normalise(raw: Record<PrimaryEmotion, number>): EmotionScore[] {
  const values = Object.values(raw)
  const max = Math.max(...values, 1)

  return (Object.entries(raw) as [PrimaryEmotion, number][])
    .map(([emotion, score]) => ({
      emotion,
      score: Math.round((score / max) * 100),
      confidence: score / max,
    }))
    .sort((a, b) => b.score - a.score)
}

// ─── Main Detection Function ──────────────────────────────────────────────────

/**
 * Run local emotion detection on a text window.
 * Call this every CYCLE_WORDS words with the last ~300 words of text.
 * Returns null if text is too short to score meaningfully.
 */
export function detectEmotion(
  text: string,
  wordOffset: number
): DetectionResult | null {
  const tokens = tokenise(text)
  if (tokens.length < 5) return null

  const raw = scoreText(tokens)
  const scores = normalise(raw)
  const dominant = scores[0]

  if (dominant.score === 0) return null

  // Conflict detection: find all emotions above BLEND_MIN_SCORE
  const aboveThreshold = scores.filter(s => s.score >= BLEND_MIN_SCORE)
  const isConflict = aboveThreshold.length >= 2 &&
    (aboveThreshold[0].score - aboveThreshold[1].score) <= CONFLICT_THRESHOLD

  const blendEmotions = isConflict
    ? aboveThreshold.slice(0, 3).map(s => s.emotion)
    : [dominant.emotion]

  return {
    dominant:      dominant.emotion,
    scores,
    isConflict,
    blendEmotions,
    confidence:    dominant.confidence,
    wordOffset,
    source:        'local',
  }
}

export { CYCLE_WORDS }
