import type { PrimaryEmotion, CustomEmotionMapping, DetectionResult } from '../types/emotion'
import { PRIMARY_EMOTIONS } from '../types/emotion'
import { buildPollinationsImageUrl } from '../lib/sceneImageUrl'

// ─── Groq API Client ──────────────────────────────────────────────────────────
// Uses Groq's free API (llama-3.3-70b) instead of Claude.
// Get a free key at: console.groq.com — no credit card needed.

export interface APIConfig {
  enabled: boolean
  apiKey: string | undefined
  model: string
  maxTokens: number
}

export const defaultConfig: APIConfig = {
  enabled: typeof import.meta !== 'undefined'
    ? !!import.meta.env?.VITE_GROQ_API_KEY
    : false,
  apiKey: typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_GROQ_API_KEY
    : undefined,
  model: 'llama-3.3-70b-versatile',
  maxTokens: 120,
}

async function callGroq(
  systemPrompt: string,
  userMessage: string,
  config: APIConfig,
  maxTokens?: number
): Promise<string | null> {
  if (!config.enabled || !config.apiKey) return null

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens ?? config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      console.warn('[ChromaWrite Groq] Call failed:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    let text = data?.choices?.[0]?.message?.content?.trim() ?? null;
    if (text) {
      if (!/[.!?]$/.test(text)) text += '.';
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }
    return text;
  } catch (err) {
    console.warn('[ChromaWrite Groq] Network error:', err)
    return null
  }
}

// ─── 1. Custom Emotion Mapping ────────────────────────────────────────────────

const EMOTION_LIST = PRIMARY_EMOTIONS.join(', ')

export async function mapCustomEmotion(
  rawLabel: string,
  config: APIConfig = defaultConfig
): Promise<CustomEmotionMapping> {
  const fallback: CustomEmotionMapping = {
    rawLabel,
    mappedTo: 'Melancholy',
    confidence: 0.4,
    source: 'api',
  }

  const result = await callGroq(
    `You map a user-described emotion to the nearest entry in a fixed vocabulary.
Respond with ONLY a JSON object like: {"emotion": "Melancholy", "confidence": 0.85}
Vocabulary: ${EMOTION_LIST}
No explanation, no markdown, just the JSON.`,
    `Map this emotion: "${rawLabel}"`,
    config,
    60
  )

  if (!result) return fallback

  try {
    const clean = result.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    const mappedTo = PRIMARY_EMOTIONS.find(
      e => e.toLowerCase() === (parsed.emotion ?? '').toLowerCase()
    )
    if (!mappedTo) return fallback
    return {
      rawLabel,
      mappedTo,
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
      source: 'api',
    }
  } catch {
    return fallback
  }
}

// ─── 2. Tier 2 Nudge ──────────────────────────────────────────────────────────

export async function getTier2Nudge(
  recentText: string,
  dominant: PrimaryEmotion,
  config: APIConfig = defaultConfig
): Promise<string | null> {
  const words = recentText.trim().split(/\s+/)
  const window = words.slice(-300).join(' ')

  return callGroq(
    `You are a thoughtful creative writing companion.
Read the excerpt and give ONE specific, gentle dramatic nudge — a single sentence or short question.
Do NOT continue the story. Do NOT give generic advice.
Focus on what is happening emotionally and what could shift, deepen, or complicate it.
The detected emotional tone is: ${dominant}.
Respond with only the nudge, no preamble. The response MUST start with a capital letter and end with a punctuation mark.`,
    window,
    config,
    80
  )
}

// ─── 3. Ambiguous Detection Refinement ───────────────────────────────────────

export async function refineDetection(
  recentText: string,
  topCandidates: PrimaryEmotion[],
  config: APIConfig = defaultConfig
): Promise<DetectionResult['dominant'] | null> {
  const words = recentText.trim().split(/\s+/)
  const window = words.slice(-150).join(' ')
  const candidates = topCandidates.slice(0, 4).join(', ')

  const result = await callGroq(
    `You identify the dominant emotional tone in a writing excerpt.
Choose EXACTLY ONE word from this list: ${candidates}
Respond with only that single word, nothing else.`,
    window,
    config,
    15
  )

  if (!result) return null
  return PRIMARY_EMOTIONS.find(e => e.toLowerCase() === result.toLowerCase()) ?? null
}

// ─── 4. Session Fingerprint ───────────────────────────────────────────────────

export async function generateFingerprint(
  dominantEmotion: PrimaryEmotion,
  shiftCount: number,
  wordCount: number,
  distribution: Partial<Record<PrimaryEmotion, number>>,
  config: APIConfig = defaultConfig
): Promise<string | null> {
  const distSummary = Object.entries(distribution)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .slice(0, 4)
    .map(([e, pct]) => `${e}: ${pct}%`)
    .join(', ')

  return callGroq(
    `You write a single evocative sentence capturing the emotional fingerprint of a writing session.
It should feel like a description of the story's soul — poetic, precise, not generic.
Do not mention statistics. Write as though describing what the story feels like to read.
Respond with only the sentence, nothing else.`,
    `Dominant emotion: ${dominantEmotion}
Emotional shifts: ${shiftCount}
Word count: ${wordCount}
Emotion distribution: ${distSummary}`,
    config,
    80
  )
}

// ─── Pollinations AI — image generation (free, no key needed) ────────────────
// Uses pollinations.ai which is completely free and requires no API key.
// Images are generated via a simple GET request with a prompt in the URL.
export const imageConfig = {
  enabled: true, // always enabled — Pollinations is free, no key required
  apiKey: undefined as undefined,
}

export async function generateSceneImage(
  recentText: string,
  dominant: PrimaryEmotion,
  moodHex: string,
  storyTitle: string,
): Promise<string | null> {
  const words = recentText.trim().split(/\s+/).slice(-120).join(' ')
  const safeTitle = storyTitle.slice(0, 80)
  const prompt =
    `painterly literary illustration, "${safeTitle}", ` +
    `mood ${dominant}, palette ${moodHex}, ` +
    `${words.slice(0, 280)}, ` +
    `atmospheric literary art, no text, painterly`

  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 999999)
  return buildPollinationsImageUrl(encoded, seed)
}

// ─── Three continuation options (replaces nudge) ─────────────────────────────
// Returns 3 short story continuations the user can pick from and auto-append.
// Each is 1-3 sentences, stylistically matched to the story's voice and emotion.
export async function getThreeContinuations(
  recentText: string,
  dominant: PrimaryEmotion,
  storyContext: string,
  config: APIConfig = defaultConfig
): Promise<string[] | null> {
  const textWindow = recentText.trim().split(/\s+/).slice(-200).join(' ')
  
  const result = await callGroq(
    `You are a creative writing assistant. Based on the story excerpt, write exactly 3 brief continuation options.
Each option should be 1-3 sentences, written in the same voice and style as the existing text.
The dominant emotion is: ${dominant}.
Story opening for context: "${storyContext.slice(0, 300)}"

Rules:
- Each option should feel like a natural continuation of the last sentence
- Options should be meaningfully different from each other (different directions/tones)
- Write in the same prose style as the story — do not use quotes or labels
- Respond with ONLY the 3 options separated by the delimiter |||
- No numbering, no labels, no explanation
- Each option should be 1-3 sentences maximum`,
    textWindow,
    config,
    250
  )
  
  if (!result) return null
  const parts = result.split('|||').map(s => s.trim()).filter(s => s.length > 10)
  if (parts.length < 2) return null
  return parts.slice(0, 3)
}
