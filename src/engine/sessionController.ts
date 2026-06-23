import { detectEmotion, CYCLE_WORDS } from './localScorer'
import { ArcTracker }                 from './arcTracker'
import { SuggestionEngine }           from './suggestionEngine'
import { buildCSSVars, COLOUR_DICTIONARY } from './colourDictionary'
import { refineDetection }            from '../api/claudeClient'
import type {
  PrimaryEmotion,
  DetectionResult,
  Suggestion,
  SessionState,
  CustomEmotionMapping,
} from '../types/emotion'
import type { APIConfig }             from '../api/claudeClient'
import { defaultConfig }              from '../api/claudeClient'

// ─── Bar Charge Rates ─────────────────────────────────────────────────────────
// Points per word typed

const IMAGE_CHARGE_PER_WORD    = 100 / 40    // full charge after ~40 words
const PROMPTER_CHARGE_PER_WORD = 100 / 40    // full charge after ~40 words

// Confidence threshold below which we ask API to refine
const REFINE_THRESHOLD = 0.40
const TIME_INTERVAL_MS = 15_000
/** Throttle so mood colour updates while typing (not only on AI / word cycles) */
const COLOUR_PREVIEW_THROTTLE_MS = 90

// ─── Session Controller ───────────────────────────────────────────────────────

export type ColourUpdateHandler = (vars: Record<string, string>) => void
export type SuggestionHandler   = (suggestion: Suggestion) => void
export type BarUpdateHandler    = (image: number, prompter: number) => void

export class SessionController {
  private arc         = new ArcTracker()
  private suggestions = new SuggestionEngine()
  private apiConfig:    APIConfig

  private wordCount   = 0
  private cycleCount  = 0
  private lastCycleAt = 0  // word count at last cycle fire

  private imageBar    = 0
  private prompterBar = 0

  private currentDominant:   PrimaryEmotion | null = null
  private currentBlend:      PrimaryEmotion[]      = []
  private currentConfidence: number                = 0
  /** Last scores used for buildCSSVars — kept in sync for refreshColour() */
  private lastScores: Array<{ emotion: PrimaryEmotion; score: number }> = []

  private lastText   = ''
  private timerHandle: ReturnType<typeof setInterval> | null = null
  private colourPreviewTimer: ReturnType<typeof setTimeout> | null = null
  private lastColourPreviewAt = 0

  // Callbacks — set by the editor component
  onColourUpdate?: ColourUpdateHandler
  onSuggestion?:  SuggestionHandler
  onBarUpdate?:   BarUpdateHandler

  constructor(
    private storyId: string,
    private startingEmotion: PrimaryEmotion | 'neutral' | CustomEmotionMapping,
    apiConfig: APIConfig = defaultConfig,
    previousArcPoints?: Array<{ dominant: string; confidence: number; wordOffset: number; timestamp: number }>
  ) {
    this.apiConfig = apiConfig
    // Seed previous arc BEFORE applying starting emotion so history is preserved
    if (previousArcPoints && previousArcPoints.length > 0) {
      this.arc.seedFromPrevious(previousArcPoints as any)
      // Set current dominant to last known emotion for continuity
      const lastPoint = previousArcPoints[previousArcPoints.length - 1]
      if (lastPoint) {
        this.currentDominant = lastPoint.dominant as PrimaryEmotion
        this.currentBlend    = [lastPoint.dominant as PrimaryEmotion]
        this.currentConfidence = lastPoint.confidence
      }
    }
    this.applyStartingEmotion()
    // 15-second periodic mood re-check
    this.timerHandle = setInterval(() => {
      const words = this.lastText.trim().split(/\s+/).filter(Boolean)
      if (words.length >= 5) {
        const window = words.slice(-80).join(' ')
        this.runDetectionCycle(window)
      }
    }, TIME_INTERVAL_MS)
  }

  destroy() {
    if (this.timerHandle) {
      clearInterval(this.timerHandle)
      this.timerHandle = null
    }
    if (this.colourPreviewTimer) {
      clearTimeout(this.colourPreviewTimer)
      this.colourPreviewTimer = null
    }
  }

  // ── Starting State ──────────────────────────────────────────────────────────

  private applyStartingEmotion() {
    if (this.startingEmotion === 'neutral') {
      // No colour, blank start
      this.emitColour({
        '--cw-emotion-primary':    '#0d0c0a',
        '--cw-emotion-accent':     '#1a1a1a',
        '--cw-emotion-blended':    '#0d0c0a',
        '--cw-emotion-rgb':        '13, 12, 10',
        '--cw-emotion-saturation': '0%',
        '--cw-transition-ms':      '12000ms',
      })
      return
    }

    const emotion: PrimaryEmotion =
      typeof this.startingEmotion === 'string'
        ? this.startingEmotion
        : this.startingEmotion.mappedTo

    const confidence =
      typeof this.startingEmotion === 'object'
        ? this.startingEmotion.confidence
        : 1.0

    this.currentDominant   = emotion
    this.currentBlend      = [emotion]
    this.currentConfidence = confidence
    this.lastScores        = [{ emotion, score: 100 }]

    const vars = buildCSSVars(
      emotion,
      [emotion],
      this.lastScores,
      confidence
    )
    this.emitColour(vars)
  }

  // ── Word Input ──────────────────────────────────────────────────────────────

  /**
   * Call this on every keystroke (debounced at word boundaries).
   * Pass the full text of the editor each time.
   */
  async onTextChange(fullText: string, skipCharge: boolean = false) {
    this.lastText = fullText

    const words    = fullText.trim().split(/\s+/).filter(Boolean)
    const newCount = words.length
    const delta    = newCount - this.wordCount
    this.wordCount = newCount

    // Charge bars unless AI generated
    if (!skipCharge && delta > 0) {
      this.imageBar    = Math.min(100, this.imageBar    + delta * IMAGE_CHARGE_PER_WORD)
      this.prompterBar = Math.min(100, this.prompterBar + delta * PROMPTER_CHARGE_PER_WORD)
      this.onBarUpdate?.(
        Math.round(this.imageBar),
        Math.round(this.prompterBar)
      )
    }
  }

  // ── Detection Cycle ─────────────────────────────────────────────────────────

  private async runDetectionCycle(textWindow: string) {
    this.cycleCount++

    let result: DetectionResult | null = detectEmotion(textWindow, this.wordCount)
    if (!result) {
      // If we found zero keywords securely locally, fallback to established context
      // so the AI API can still refine the sentiment without snapping to Happiness incorrectly.
      let fallbackDominant = this.currentDominant;
      if (!fallbackDominant && typeof this.startingEmotion === 'string' && this.startingEmotion !== 'neutral') {
        fallbackDominant = this.startingEmotion as PrimaryEmotion;
      }
      fallbackDominant = fallbackDominant || 'Happiness';
      
      let fallbackBlend = this.currentBlend && this.currentBlend.length > 0
        ? this.currentBlend
        : [fallbackDominant];

      result = {
        dominant: fallbackDominant,
        scores: [],
        isConflict: false,
        blendEmotions: fallbackBlend,
        confidence: 0,
        wordOffset: this.wordCount,
        source: 'local'
      }
    }

    // If confidence is low and API is available, refine
    if (result.confidence < REFINE_THRESHOLD && this.apiConfig.enabled) {
      const topCandidates = result.scores.slice(0, 4).map(s => s.emotion)
      const refined = await refineDetection(textWindow, topCandidates, this.apiConfig)
      if (refined) {
        result = {
          ...result,
          dominant:      refined,
          blendEmotions: [refined],
          confidence:    0.65,  // API refinement bumps confidence
          source:        'api',
        }
      }
    }

    // Update state
    this.currentDominant   = result.dominant
    this.currentBlend      = result.blendEmotions
    this.currentConfidence = result.confidence
    this.lastScores        = result.scores.map(s => ({ emotion: s.emotion, score: s.score }))

    // Record to arc
    const flatlineCount = this.arc.record(result)

    const vars = buildCSSVars(
      result.dominant,
      result.blendEmotions,
      result.scores,
      result.confidence
    )
    vars['--cw-transition-ms'] = `${COLOUR_DICTIONARY[result.dominant].transitionMs}ms`
    this.emitColour(vars)

    // Evaluate suggestions
    const suggestion = this.suggestions.evaluate({
      cycleIndex:     this.cycleCount,
      flatlineCount,
      dominant:       result.dominant,
      isConflict:     result.isConflict,
      blendEmotions:  result.blendEmotions,
      prompterCharge: this.prompterBar,
    })

    if (suggestion) {
      this.onSuggestion?.(suggestion)
    }
  }

  // ── Bar Actions ─────────────────────────────────────────────────────────────

  /** Call when user taps Image bar at 100% */
  consumeImageBar(): boolean {
    if (this.imageBar < 100) return false
    this.imageBar = 0
    // Small delay so component starts async work before UI resets
    setTimeout(() => this.onBarUpdate?.(0, Math.round(this.prompterBar)), 80)
    return true
  }

  /** Call when user taps Prompter bar at 100%. Returns true if ready. */
  consumePrompterBar(): boolean {
    if (this.prompterBar < 100) return false
    this.prompterBar = 0
    setTimeout(() => this.onBarUpdate?.(Math.round(this.imageBar), 0), 80)
    return true
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get sessionState(): Omit<SessionState, 'storyId' | 'title'> {
    return {
      startingEmotion: this.startingEmotion,
      currentDominant: this.currentDominant,
      currentBlend:    this.currentBlend,
      arc:             this.arc.allPoints,
      wordCount:       this.wordCount,
      cycleCount:      this.cycleCount,
      flatlineCount:   this.arc.currentFlatlineCount,
      imageBarCharge:  Math.round(this.imageBar),
      prompterBarCharge: Math.round(this.prompterBar),
      suggestions:     [],  // managed externally by UI
    }
  }

  get arcSnapshot() {
    return this.arc.snapshot()
  }

  get dominant() { return this.currentDominant }
  get blend()    { return this.currentBlend }

  /**
   * Re-emit colour vars from current state. Call after `onColourUpdate` is wired —
   * the constructor runs `applyStartingEmotion()` before the React callback exists.
   */
  refreshColour(): void {
    if (this.startingEmotion === 'neutral') {
      this.emitColour({
        '--cw-emotion-primary':    '#0d0c0a',
        '--cw-emotion-accent':     '#1a1a1a',
        '--cw-emotion-blended':    '#0d0c0a',
        '--cw-emotion-rgb':        '13, 12, 10',
        '--cw-emotion-saturation': '0%',
        '--cw-transition-ms':      '12000ms',
      })
      return
    }
    if (!this.currentDominant) return
    const scores = this.lastScores.length
      ? this.lastScores
      : [{ emotion: this.currentDominant, score: 100 }]
    const vars = buildCSSVars(
      this.currentDominant,
      this.currentBlend.length ? this.currentBlend : [this.currentDominant],
      scores,
      this.currentConfidence
    )
    this.emitColour(vars)
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private emitColour(vars: Record<string, string>) {
    this.onColourUpdate?.(vars)
  }
}
