// ─── Arc Tracker ──────────────────────────────────────────────────────────────

export class ArcTracker {
  constructor() {
    this.points = [];
    this.flatlineCount = 0;
    this.lastDominant = null;
  }

  reset() {
    this.points = [];
    this.flatlineCount = 0;
    this.lastDominant = null;
  }

  /**
   * Seed the arc with points from a previous session.
   */
  seedFromPrevious(previousPoints) {
    if (!previousPoints || previousPoints.length === 0) return;
    this.points = [...previousPoints, ...this.points];
    const last = previousPoints[previousPoints.length - 1];
    if (last) {
      this.lastDominant = last.dominant;
    }
  }

  /**
   * Record a detection result into the arc.
   */
  record(result) {
    const point = {
      wordOffset: result.wordOffset,
      dominant: result.dominant,
      blendEmotions: result.blendEmotions,
      confidence: result.confidence,
      timestamp: Date.now(),
    };
    this.points.push(point);

    if (result.dominant === this.lastDominant) {
      this.flatlineCount++;
    } else {
      this.flatlineCount = 1;
      this.lastDominant = result.dominant;
    }

    return this.flatlineCount;
  }

  get currentFlatlineCount() {
    return this.flatlineCount;
  }

  get allPoints() {
    return [...this.points];
  }

  /**
   * Full snapshot for Stats tab / report generation
   */
  snapshot() {
    if (this.points.length === 0) {
      return {
        points: [],
        dominantOverall: null,
        shiftCount: 0,
        longestFlatline: null,
        conflictMoments: [],
        distribution: {},
      };
    }

    // Distribution
    const counts = {};
    for (const p of this.points) {
      counts[p.dominant] = (counts[p.dominant] ?? 0) + 1;
    }
    const total = this.points.length;
    const distribution = {};
    for (const [emotion, count] of Object.entries(counts)) {
      distribution[emotion] = Math.round((count / total) * 100);
    }

    // Dominant overall
    const dominantOverall = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

    // Shift count
    let shiftCount = 0;
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].dominant !== this.points[i - 1].dominant) shiftCount++;
    }

    // Longest flatline
    let longestFlatline = null;
    let currentRun = 1;
    for (let i = 1; i < this.points.length; i++) {
      if (this.points[i].dominant === this.points[i - 1].dominant) {
        currentRun++;
        if (!longestFlatline || currentRun > longestFlatline.cycles) {
          longestFlatline = { emotion: this.points[i].dominant, cycles: currentRun };
        }
      } else {
        currentRun = 1;
      }
    }

    // Conflict moments
    const conflictMoments = this.points.filter((p) => p.blendEmotions.length > 1);

    return {
      points: [...this.points],
      dominantOverall,
      shiftCount,
      longestFlatline,
      conflictMoments,
      distribution,
    };
  }
}
