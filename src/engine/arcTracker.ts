import type { ArcPoint, DetectionResult, PrimaryEmotion } from '../types/emotion'

// ─── Arc Tracker ──────────────────────────────────────────────────────────────

export interface ArcSnapshot {
  points: ArcPoint[]
  dominantOverall: PrimaryEmotion | null
  /** How many times emotion shifted (consecutive different dominants) */
  shiftCount: number
  /** Longest flatline: { emotion, cycles } */
  longestFlatline: { emotion: PrimaryEmotion; cycles: number } | null
  /** Moments where blendEmotions.length > 1 */
  conflictMoments: ArcPoint[]
  /** Distribution: emotion → percentage of cycles */
  distribution: Partial<Record<PrimaryEmotion, number>>
}

export class ArcTracker {
  private points: ArcPoint[] = []
  private flatlineCount: number = 0
  private lastDominant: PrimaryEmotion | null = null

  reset() {
    this.points = []
    this.flatlineCount = 0
    this.lastDominant = null
  }

  /**
   * Seed the arc with points from a previous session.
   * These are prepended so the full story arc is Joy→Serene→Melancholy→Rage etc.
   * New session points are then appended on top.
   */
  seedFromPrevious(previousPoints: ArcPoint[]) {
    if (!previousPoints || previousPoints.length === 0) return
    // Prepend previous points, new ones will be appended via record()
    this.points = [...previousPoints, ...this.points]
    // Set last dominant to the last point of previous session
    // so flatlineCount continues correctly
    const last = previousPoints[previousPoints.length - 1]
    if (last) {
      this.lastDominant = last.dominant
    }
  }

  /**
   * Record a detection result into the arc.
   * Returns the updated flatline count for the current emotion.
   */
  record(result: DetectionResult): number {
    const point: ArcPoint = {
      wordOffset:    result.wordOffset,
      dominant:      result.dominant,
      blendEmotions: result.blendEmotions,
      confidence:    result.confidence,
      timestamp:     Date.now(),
    }
    this.points.push(point)

    if (result.dominant === this.lastDominant) {
      this.flatlineCount++
    } else {
      this.flatlineCount = 1
      this.lastDominant = result.dominant
    }

    return this.flatlineCount
  }

  get currentFlatlineCount() {
    return this.flatlineCount
  }

  get allPoints(): ArcPoint[] {
    return [...this.points]
  }

  /**
   * Full snapshot for Stats tab / report generation
   */
  snapshot(): ArcSnapshot {
    if (this.points.length === 0) {
      return {
        points: [],
        dominantOverall: null,
        shiftCount: 0,
        longestFlatline: null,
        conflictMoments: [],
        distribution: {},
      }
    }

    // Distribution
    const counts: Partial<Record<PrimaryEmotion, number>> = {}
    for (const p of this.points) {
      counts[p.dominant] = (counts[p.dominant] ?? 0) + 1
    }
    const total = this.points.length
    const distribution: Partial<Record<PrimaryEmotion, number>> = {}
    for (const [emotion, count] of Object.entries(counts) as [PrimaryEmotion, number][]) {
      distribution[emotion] = Math.round((count / total) * 100)
    }

    // Dominant overall
    const dominantOverall = (Object.entries(counts) as [PrimaryEmotion, number][])
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    // Shift count
    let shiftCount = 0
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].dominant !== this.points[i - 1].dominant) shiftCount++
    }

    // Longest flatline
    let longestFlatline: { emotion: PrimaryEmotion; cycles: number } | null = null
    let currentRun = 1
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].dominant === this.points[i - 1].dominant) {
        currentRun++
        if (!longestFlatline || currentRun > longestFlatline.cycles) {
          longestFlatline = { emotion: this.points[i].dominant, cycles: currentRun }
        }
      } else {
        currentRun = 1
      }
    }

    // Conflict moments
    const conflictMoments = this.points.filter(p => p.blendEmotions.length > 1)

    return {
      points: [...this.points],
      dominantOverall,
      shiftCount,
      longestFlatline,
      conflictMoments,
      distribution,
    }
  }
}
