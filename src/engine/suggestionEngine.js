// ─── Tier 1 Templates ─────────────────────────────────────────────────────────

const FLATLINE_TRIGGER = 5; // consecutive cycles in same emotion

const TIER1_TEMPLATES = {
  Melancholy: [
    "You've held Melancholy through this passage. Something could shift — a memory, an intrusion, a small act.",
    "The weight here is sustained. Even grief has moments of unexpected colour.",
    "Your character has been still in sorrow for a while. What might disturb that stillness?",
  ],
  Resolve: [
    "Resolve has carried this passage far. What tests it? What almost breaks it?",
    "Sustained determination can become its own kind of blindness. What is your character not seeing?",
    "The forward motion here is strong. Consider a moment of doubt — even brief.",
  ],
  Curiosity: [
    "Your writing has been exploratory for a while. Does it find something — or does something find it?",
    "Curiosity sustained long enough becomes obsession. Is that a direction worth exploring?",
    "What does your character discover that they weren't looking for?",
  ],
  Serenity: [
    "This stillness has held for a while. What is it that stillness is keeping at bay?",
    "Peace in a story is often the eye of something larger. What surrounds it?",
    "Serenity can be earned or fragile. Which is this?",
  ],
  Dread: [
    "The dread here has been building. Consider releasing it — or deepening it past the point of return.",
    "Sustained fear needs either a source revealed or a new direction. The anticipation can't hold forever.",
    "What does your character do when they can no longer look away?",
  ],
  Wonder: [
    "You've held wonder for a while. What is the cost of seeing things this clearly?",
    "Awe sustained too long can become distance. Does your character feel small, or expanded?",
    "What ordinary thing interrupts the wonder? That contrast might be the story.",
  ],
  Yearning: [
    "Yearning has shaped this passage. What would it mean if the thing longed for actually arrived?",
    "The reach here is sustained. Consider what it costs to keep reaching.",
    "What does your character do with a longing they know can never be answered?",
  ],
  Rage: [
    "The rage here has been held at this pitch for a while. Rage exhausts — what comes after?",
    "Consider what the anger is protecting. Rage is rarely only itself.",
    "What would it take for this fury to become something else — grief, or resolve, or silence?",
  ],
  Joy: [
    "The joy here has been sustained. In a story, joy is most powerful just before it shifts.",
    "What does this happiness rest on? Is it solid ground or glass?",
    "Consider a moment that complicates the brightness — not negates it, just texture.",
  ],
  Grief: [
    "Grief has carried this passage. What moment of unexpected relief — even brief — might surface?",
    "The loss here is sustained. Sometimes grief finds something it didn't know it was holding.",
    "What does your character do with grief when they are too tired to keep feeling it?",
  ],
  Tenderness: [
    "This tenderness has been sustained. Tender things are often also fragile — what threatens it?",
    "Care held this long becomes devotion. What does devotion cost?",
    "What would it mean if the thing being protected couldn't be protected?",
  ],
  Tension: [
    "The tension here has been coiled for a while. Something needs to give — or the coil needs to tighten.",
    "Sustained unease needs resolution or escalation. Which serves your story?",
    "What does your character do when they can no longer pretend everything is fine?",
  ],
};

const TIER3_TEMPLATES = [
  (e1, e2) =>
    `Your writing is holding ${e1} and ${e2} at the same time. That tension is interesting — let it stay.`,
  (e1, e2) =>
    `${e1} and ${e2} are coexisting in this passage. Real emotion is rarely clean. Keep going.`,
  (e1, e2, e3) =>
    e3
      ? `Three emotional currents — ${e1}, ${e2}, ${e3} — are moving through this passage simultaneously. That's complexity worth trusting.`
      : `The mix of ${e1} and ${e2} here is doing something. Don't resolve it too quickly.`,
];

let _id = 0;
function uid() {
  return `sug_${Date.now()}_${_id++}`;
}

export class SuggestionEngine {
  constructor() {
    this.lastTier1At = -99;
    this.lastTier3At = -99;
    this.TIER1_COOLDOWN = 8;
    this.TIER3_COOLDOWN = 4;
  }

  evaluate(params) {
    const { cycleIndex, flatlineCount, dominant, isConflict, blendEmotions, prompterCharge } = params;

    // Tier 3 — conflict, free, cooldown-gated
    if (
      isConflict &&
      blendEmotions.length >= 2 &&
      cycleIndex - this.lastTier3At >= this.TIER3_COOLDOWN
    ) {
      this.lastTier3At = cycleIndex;
      const [e1, e2, e3] = blendEmotions;
      const pick = TIER3_TEMPLATES[cycleIndex % TIER3_TEMPLATES.length];
      return {
        id: uid(),
        tier: 3,
        message: pick(e1, e2, e3),
        emotion: dominant,
        timestamp: Date.now(),
        dismissed: false,
      };
    }

    // Tier 1 — flatline, free, cooldown-gated
    if (
      flatlineCount >= FLATLINE_TRIGGER &&
      cycleIndex - this.lastTier1At >= this.TIER1_COOLDOWN
    ) {
      this.lastTier1At = cycleIndex;
      const templates = TIER1_TEMPLATES[dominant] || TIER1_TEMPLATES.Melancholy;
      const message = templates[cycleIndex % templates.length];
      return {
        id: uid(),
        tier: 1,
        message,
        emotion: dominant,
        timestamp: Date.now(),
        dismissed: false,
      };
    }

    return null;
  }

  tier2Available(prompterCharge) {
    return prompterCharge >= 100;
  }

  reset() {
    this.lastTier1At = -99;
    this.lastTier3At = -99;
  }
}

export { FLATLINE_TRIGGER };
