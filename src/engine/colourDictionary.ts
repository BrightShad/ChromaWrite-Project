import type { PrimaryEmotion, EmotionColour } from '../types/emotion'

// ─── Colour Dictionary ─────────────────────────────────────────────────────────
// Each emotion has a primary hex, derived RGB, and a secondary accent
// Saturation is driven externally by confidence score

export interface EmotionColourEntry {
  primary: EmotionColour
  /** Lighter accent used for suggestions box border / text highlights */
  accent: string
  /** CSS transition duration for ambient wash when shifting TO this emotion */
  transitionMs: number
  /** Label shown in UI */
  label: PrimaryEmotion
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function entry(
  hex: string,
  accent: string,
  transitionMs: number,
  label: PrimaryEmotion
): EmotionColourEntry {
  return {
    primary: { hex, rgb: hexToRgb(hex), saturation: 1 },
    accent,
    transitionMs,
    label,
  }
}

export const COLOUR_DICTIONARY: Record<PrimaryEmotion, EmotionColourEntry> = {
  // --- Anger Family ---
  Anger           : entry('#c33022', '#a82424', 4000, 'Anger'),
  Enraged         : entry('#e63c19', '#a82f24', 4000, 'Enraged'),
  Jealous         : entry('#a32933', '#a8243a', 4500, 'Jealous'),
  Resentful       : entry('#cc6633', '#a84524', 5000, 'Resentful'),
  Exasperated     : entry('#b8143d', '#a82450', 5500, 'Exasperated'),
  Irritable       : entry('#cc8033', '#a85b24', 6000, 'Irritable'),
  Annoyed         : entry('#a3295c', '#a82466', 6500, 'Annoyed'),
  Aggravated      : entry('#e6a219', '#a87124', 7000, 'Aggravated'),
  // --- Disgust Family ---
  Disgust         : entry('#739550', '#6a804d', 4000, 'Disgust'),
  Revolted        : entry('#77b34d', '#66804d', 4000, 'Revolted'),
  Disappointed    : entry('#6d7a52', '#73804d', 4500, 'Disappointed'),
  Nauseated       : entry('#739966', '#5e804d', 5000, 'Nauseated'),
  Disapproving    : entry('#818f3d', '#7b804d', 5500, 'Disapproving'),
  Contemptuous    : entry('#6a9966', '#55804d', 6000, 'Contemptuous'),
  Disrespectful   : entry('#7a7a52', '#807b4d', 6500, 'Disrespectful'),
  Scornful        : entry('#4db355', '#4d804d', 7000, 'Scornful'),
  // --- Fear Family ---
  Fear            : entry('#593e74', '#463960', 4000, 'Fear'),
  Terrified       : entry('#6d3d8f', '#493960', 4000, 'Terrified'),
  Panicked        : entry('#473d5c', '#403960', 4500, 'Panicked'),
  Horrified       : entry('#70527a', '#503960', 5000, 'Horrified'),
  Insecure        : entry('#382e6b', '#393960', 5500, 'Insecure'),
  Nervous         : entry('#77527a', '#563960', 6000, 'Nervous'),
  Anxious         : entry('#3d3d5c', '#394060', 6500, 'Anxious'),
  Worried         : entry('#8f3d88', '#5c3960', 7000, 'Worried'),
  // --- Happiness Family ---
  Happiness       : entry('#eebd2b', '#e69019', 4000, 'Happiness'),
  Content         : entry('#fada38', '#e6a219', 4000, 'Content'),
  Elated          : entry('#df8f20', '#e66f19', 4500, 'Elated'),
  Proud           : entry('#e5e54d', '#e6c319', 5000, 'Proud'),
  Excited         : entry('#f96b06', '#e64d19', 5500, 'Excited'),
  Cheerful        : entry('#cce54d', '#e6e619', 6000, 'Cheerful'),
  Playful         : entry('#df5020', '#e62a19', 6500, 'Playful'),
  Optimistic      : entry('#b9fa38', '#c3e619', 7000, 'Optimistic'),
  Nostalgic       : entry('#df3020', '#e6192a', 7500, 'Nostalgic'),
  // --- Surprise Family ---
  Surprise        : entry('#28bdae', '#29a385', 4000, 'Surprise'),
  Startled        : entry('#20dfdc', '#29a38f', 4000, 'Startled'),
  Amazed          : entry('#2e9e80', '#29a370', 4500, 'Amazed'),
  Stunned         : entry('#39b1c6', '#29a3a3', 5000, 'Stunned'),
  Moved           : entry('#1ab370', '#29a35c', 5500, 'Moved'),
  Confused        : entry('#3999c6', '#298fa3', 6000, 'Confused'),
  Disillusioned   : entry('#2e9e5b', '#29a347', 6500, 'Disillusioned'),
  Perplexed       : entry('#2083df', '#297aa3', 7000, 'Perplexed'),
  // --- Sadness Family ---
  Sadness         : entry('#364d7d', '#324d67', 4000, 'Sadness'),
  Hurt            : entry('#334d99', '#324867', 4000, 'Hurt'),
  Mournful        : entry('#364d63', '#325567', 4500, 'Mournful'),
  Depressed       : entry('#474d85', '#323f67', 5000, 'Depressed'),
  Lonely          : entry('#265973', '#325e67', 5500, 'Lonely'),
  Ashamed         : entry('#4c4785', '#323667', 6000, 'Ashamed'),
  Guilty          : entry('#365c63', '#326767', 6500, 'Guilty'),
  Regretful       : entry('#4d3399', '#363267', 7000, 'Regretful'),
}

// ─── Colour Blending ──────────────────────────────────────────────────────────

/**
 * Blend up to 3 emotion colours by their score weights.
 * Returns a hex string of the weighted mix.
 */
export function blendColours(
  emotions: Array<{ emotion: PrimaryEmotion; weight: number }>
): string {
  if (emotions.length === 0) return '#0d0c0a'
  if (emotions.length === 1) {
    return COLOUR_DICTIONARY[emotions[0].emotion].primary.hex
  }

  const totalWeight = emotions.reduce((s, e) => s + e.weight, 0)
  let r = 0, g = 0, b = 0

  for (const { emotion, weight } of emotions) {
    const [er, eg, eb] = COLOUR_DICTIONARY[emotion].primary.rgb
    const w = weight / totalWeight
    r += er * w
    g += eg * w
    b += eb * w
  }

  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`
}

/**
 * Apply confidence-based saturation.
 * Below 0.3 → near greyscale. 0.3–0.7 → partial. Above 0.7 → full vivid.
 */
export function confidenceToSaturation(confidence: number): number {
  if (confidence < 0.3) return 0.15 + confidence * 0.5
  if (confidence < 0.7) return 0.4 + (confidence - 0.3) * 1.5
  return 1.0
}

/**
 * Build the CSS custom properties object for a given detection result.
 * This object is applied directly to :root style.
 */
export function buildCSSVars(
  dominant: PrimaryEmotion,
  blendEmotions: PrimaryEmotion[],
  scores: Array<{ emotion: PrimaryEmotion; score: number }>,
  confidence: number
): Record<string, string> {
  const saturation = confidenceToSaturation(confidence)
  const entry = COLOUR_DICTIONARY[dominant]

  // Build blend input from top emotions
  const blendInputs = blendEmotions.length > 1
    ? blendEmotions.map(e => ({
        emotion: e,
        weight: scores.find(s => s.emotion === e)?.score ?? 1,
      }))
    : [{ emotion: dominant, weight: 1 }]

  const blendedHex = blendColours(blendInputs)
  const [br, bg, bb] = hexToRgb(blendedHex)

  return {
    '--cw-emotion-primary':   entry.primary.hex,
    '--cw-emotion-accent':    entry.accent,
    '--cw-emotion-blended':   blendedHex,
    '--cw-emotion-rgb':       `${br}, ${bg}, ${bb}`,
    '--cw-emotion-saturation': `${Math.round(saturation * 100)}%`,
    '--cw-transition-ms':     `${entry.transitionMs}ms`,
  }
}
