import { useEffect, useRef, useCallback, useState } from 'react'
import { SessionController }   from '../engine/sessionController'
import { generateFingerprint } from '../api/claudeClient'
import type { PrimaryEmotion, Suggestion, CustomEmotionMapping } from '../types/emotion'
import type { ArcSnapshot }    from '../engine/arcTracker'
import type { APIConfig }      from '../api/claudeClient'
import { defaultConfig }       from '../api/claudeClient'

// ─── useChromaSession ─────────────────────────────────────────────────────────
// Drop into your editor component. Handles all engine wiring.
//
// Usage:
//   const {
//     cssVars, suggestions, imageBar, prompterBar,
//     dominant, onTextChange, finishSession,
//     dismissSuggestion, consumeImage, consumePrompter,
//   } = useChromaSession({ storyId, startingEmotion })

interface UseChromaSessionOptions {
  storyId:           string
  startingEmotion:   PrimaryEmotion | 'neutral' | CustomEmotionMapping
  apiConfig?:        APIConfig
  previousArcPoints?: Array<{ dominant: string; confidence: number; wordOffset: number; timestamp: number }>
}

interface UseChromaSessionReturn {
  cssVars:     Record<string, string>
  suggestions: Suggestion[]
  imageBar:    number
  prompterBar: number
  dominant:    PrimaryEmotion | null
  blend:       PrimaryEmotion[]
  wordCount:   number
  /** Live arc points from the controller — use for auto-save */
  getArcPoints: () => Array<{ dominant: string; confidence: number; wordOffset: number; timestamp: number }>
  onTextChange:      (text: string, skipCharge?: boolean) => void
  dismissSuggestion: (id: string) => void
  consumeImage:      () => boolean
  consumePrompter:   () => boolean
  finishSession:     () => Promise<{
    snapshot:     ArcSnapshot
    fingerprint:  string | null
  }>
}

export function useChromaSession({
  storyId,
  startingEmotion,
  apiConfig = defaultConfig,
  previousArcPoints,
}: UseChromaSessionOptions): UseChromaSessionReturn {

  const controllerRef = useRef<SessionController | null>(null)

  const [cssVars,     setCssVars]     = useState<Record<string, string>>({})
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [imageBar,    setImageBar]    = useState(0)
  const [prompterBar, setPrompterBar] = useState(0)
  const [dominant,    setDominant]    = useState<PrimaryEmotion | null>(
    previousArcPoints && previousArcPoints.length > 0
      ? previousArcPoints[previousArcPoints.length - 1].dominant as PrimaryEmotion
      : null
  )
  const [blend,       setBlend]       = useState<PrimaryEmotion[]>([])
  const [wordCount,   setWordCount]   = useState(0)

  useEffect(() => {
    const ctrl = new SessionController(storyId, startingEmotion, apiConfig, previousArcPoints)

    ctrl.onColourUpdate = (vars) => {
      setCssVars(vars)
      // Apply to :root for CSS var access
      Object.entries(vars).forEach(([k, v]) => {
        document.documentElement.style.setProperty(k, v)
      })
      // CRITICAL: also update dominant React state so moodAccent re-computes
      // This makes colour changes from the fast-pass typing interval reach the UI!
      const newDominant = ctrl.dominant
      if (newDominant) setDominant(newDominant)
      setBlend(ctrl.blend)
    }

    ctrl.onSuggestion = (suggestion) => {
      setSuggestions(prev => [suggestion, ...prev].slice(0, 10))
    }

    ctrl.onBarUpdate = (img, prompt) => {
      setImageBar(img)
      setPrompterBar(prompt)
    }

    // Constructor emitted colours before onColourUpdate existed — replay once
    ctrl.refreshColour()

    controllerRef.current = ctrl

    return () => {
      ctrl.destroy()
      // Cleanup CSS vars on unmount
      const varNames = [
        '--cw-emotion-primary', '--cw-emotion-accent',
        '--cw-emotion-blended', '--cw-emotion-rgb',
        '--cw-emotion-saturation', '--cw-transition-ms',
      ]
      varNames.forEach(v => document.documentElement.style.removeProperty(v))
    }
  }, [storyId, startingEmotion, apiConfig]) // previousArcPoints intentionally excluded — only seed once on mount

  const onTextChange = useCallback((text: string, skipCharge: boolean = false) => {
    const ctrl = controllerRef.current
    if (!ctrl) return
    const words = text.trim().split(/\s+/).filter(Boolean).length
    setWordCount(words)
    void ctrl.onTextChange(text, skipCharge).then(() => {
      setDominant(ctrl.dominant)
      setBlend(ctrl.blend)
    })
  }, [])

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, dismissed: true } : s)
    )
  }, [])

  const consumeImage = useCallback((): boolean => {
    return controllerRef.current?.consumeImageBar() ?? false
  }, [])

  const consumePrompter = useCallback((): boolean => {
    return controllerRef.current?.consumePrompterBar() ?? false
  }, [])

  const finishSession = useCallback(async () => {
    const ctrl = controllerRef.current
    if (!ctrl) return { snapshot: { points: [], dominantOverall: null, shiftCount: 0, longestFlatline: null, conflictMoments: [], distribution: {} }, fingerprint: null }

    const snapshot = ctrl.arcSnapshot
    const fingerprint = await generateFingerprint(
      snapshot.dominantOverall ?? 'Serenity',
      snapshot.shiftCount,
      ctrl.sessionState.wordCount,
      snapshot.distribution,
      apiConfig
    )

    return { snapshot, fingerprint }
  }, [apiConfig])

  const getArcPoints = useCallback(() => {
    return controllerRef.current?.arcSnapshot.points ?? []
  }, [])

  return {
    cssVars,
    suggestions,
    imageBar,
    prompterBar,
    dominant,
    blend,
    wordCount,
    getArcPoints,
    onTextChange,
    dismissSuggestion,
    consumeImage,
    consumePrompter,
    finishSession,
  }
}
