import { ArcTracker } from "./arcTracker";
import { SuggestionEngine } from "./suggestionEngine";
import { buildCSSVars, COLOUR_DICTIONARY } from "./colourDictionary";
import { defaultConfig } from "../api/langchainClient";

const IMAGE_CHARGE_PER_WORD = 100 / 40; // full charge after ~40 words
const PROMPTER_CHARGE_PER_WORD = 100 / 40; // full charge after ~40 words
const CYCLE_WORDS = 20; // words per detection cycle

export class SessionController {
  constructor(storyId, startingEmotion, apiConfig = defaultConfig, previousArcPoints = null) {
    this.storyId = storyId;
    this.startingEmotion = startingEmotion;
    this.apiConfig = apiConfig;
    this.arc = new ArcTracker();
    this.suggestions = new SuggestionEngine();

    this.wordCount = 0;
    this.cycleCount = 0;
    this.isInitialLoad = true;
    
    this.imageBar = 0;
    this.prompterBar = 0;

    this.currentDominant = null;
    this.currentBlend = [];
    this.currentConfidence = 0;
    this.lastScores = [];

    this.lastText = "";
    this.lastCheckedWordCount = 0;
    this.idleTimerHandle = null;
    this.colourPreviewTimer = null;
    this.lastColourPreviewAt = 0;

    // Callbacks
    this.onColourUpdate = null;
    this.onSuggestion = null;
    this.onBarUpdate = null;
    this.onAssistantUpdate = null;

    this.assistantState = { status: "stable", message: null, candidateEmotion: null };

    if (previousArcPoints && previousArcPoints.length > 0) {
      this.arc.seedFromPrevious(previousArcPoints);
      const lastPoint = previousArcPoints[previousArcPoints.length - 1];
      if (lastPoint) {
        this.currentDominant = lastPoint.dominant;
        this.currentBlend = [lastPoint.dominant];
        this.currentConfidence = lastPoint.confidence;
      }
    }
    this.applyStartingEmotion();
  }

  destroy() {
    if (this.idleTimerHandle) {
      clearTimeout(this.idleTimerHandle);
      this.idleTimerHandle = null;
    }
    if (this.colourPreviewTimer) {
      clearTimeout(this.colourPreviewTimer);
      this.colourPreviewTimer = null;
    }
  }

  applyStartingEmotion() {
    if (this.startingEmotion === "neutral") {
      this.emitColour({
        "--cw-emotion-primary": "#0d0c0a",
        "--cw-emotion-accent": "#1a1a1a",
        "--cw-emotion-blended": "#0d0c0a",
        "--cw-emotion-rgb": "13, 12, 10",
        "--cw-emotion-saturation": "0%",
        "--cw-transition-ms": "12000ms",
      });
      return;
    }

    const emotion =
      typeof this.startingEmotion === "string"
        ? this.startingEmotion
        : this.startingEmotion.mappedTo;

    const confidence =
      typeof this.startingEmotion === "object"
        ? this.startingEmotion.confidence
        : 1.0;

    this.currentDominant = emotion;
    this.currentBlend = [emotion];
    this.currentConfidence = confidence;
    this.lastScores = [{ emotion, score: 100 }];

    const vars = buildCSSVars(emotion, [emotion], this.lastScores, confidence);
    this.emitColour(vars);
  }

  async onTextChange(fullText, skipCharge = false) {
    this.lastText = fullText;

    const words = fullText.trim().split(/\s+/).filter(Boolean);
    const newCount = words.length;

    if (this.isInitialLoad) {
      this.isInitialLoad = false;
      this.wordCount = newCount;
      this.lastCheckedWordCount = newCount;
      return;
    }

    const delta = newCount - this.wordCount;
    this.wordCount = newCount;

    if (!skipCharge && delta > 0) {
      this.imageBar = Math.min(100, this.imageBar + delta * IMAGE_CHARGE_PER_WORD);
      this.prompterBar = Math.min(100, this.prompterBar + delta * PROMPTER_CHARGE_PER_WORD);
      this.onBarUpdate?.(Math.round(this.imageBar), Math.round(this.prompterBar));
    }

    // Trigger detection cycle if user typed CYCLE_WORDS (15) words since last check
    const wordsSinceLastCheck = Math.abs(newCount - this.lastCheckedWordCount);
    if (wordsSinceLastCheck >= CYCLE_WORDS) {
      this.lastCheckedWordCount = newCount;
      this.triggerDetection();
    } else {
      if (this.idleTimerHandle) {
        clearTimeout(this.idleTimerHandle);
      }
      this.idleTimerHandle = setTimeout(() => {
        if (this.wordCount !== this.lastCheckedWordCount) {
          this.lastCheckedWordCount = this.wordCount;
          this.triggerDetection();
        }
      }, 2500);
    }
  }

  triggerDetection() {
    const words = this.lastText.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 5) {
      const window = words.slice(-120).join(" ");
      void this.runDetectionCycle(window);
    }
  }

  async runDetectionCycle(textWindow) {
    this.cycleCount++;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textWindow,
          wordOffset: this.wordCount,
          apiKey: this.apiConfig.apiKey,
          model: this.apiConfig.model,
          apiEnabled: this.apiConfig.enabled,
          currentDominant: this.currentDominant,
        }),
      });

      if (!response.ok) throw new Error("API call failed");
      const result = await response.json();
      if (!result) return;

      this.currentDominant = result.dominant;
      this.currentBlend = result.blendEmotions;
      this.currentConfidence = result.confidence;
      this.lastScores = result.scores.map((s) => ({ emotion: s.emotion, score: s.score }));
      this.assistantState = result.assistantState || { status: "stable", message: null, candidateEmotion: null };
      
      this.onAssistantUpdate?.(this.assistantState);

      const flatlineCount = this.arc.record(result);

      const vars = buildCSSVars(
        result.dominant,
        result.blendEmotions,
        result.scores,
        result.confidence
      );
      vars["--cw-transition-ms"] = `${COLOUR_DICTIONARY[result.dominant].transitionMs}ms`;
      this.emitColour(vars);

      const suggestion = this.suggestions.evaluate({
        cycleIndex: this.cycleCount,
        flatlineCount,
        dominant: result.dominant,
        isConflict: result.isConflict,
        blendEmotions: result.blendEmotions,
        prompterCharge: this.prompterBar,
      });

      if (suggestion) {
        this.onSuggestion?.(suggestion);
      }
    } catch (err) {
      console.warn("[ChromaWrite] API detection cycle error:", err);
    }
  }

  consumeImageBar() {
    if (this.imageBar < 100) return false;
    this.imageBar = 0;
    setTimeout(() => this.onBarUpdate?.(0, Math.round(this.prompterBar)), 80);
    return true;
  }

  consumePrompterBar() {
    if (this.prompterBar < 100) return false;
    this.prompterBar = 0;
    setTimeout(() => this.onBarUpdate?.(Math.round(this.imageBar), 0), 80);
    return true;
  }

  get sessionState() {
    return {
      startingEmotion: this.startingEmotion,
      currentDominant: this.currentDominant,
      currentBlend: this.currentBlend,
      arc: this.arc.allPoints,
      wordCount: this.wordCount,
      cycleCount: this.cycleCount,
      flatlineCount: this.arc.currentFlatlineCount,
      imageBarCharge: Math.round(this.imageBar),
      prompterBarCharge: Math.round(this.prompterBar),
      suggestions: [],
    };
  }

  get arcSnapshot() {
    return this.arc.snapshot();
  }

  get dominant() {
    return this.currentDominant;
  }
  
  get blend() {
    return this.currentBlend;
  }

  refreshColour() {
    if (this.startingEmotion === "neutral") {
      this.emitColour({
        "--cw-emotion-primary": "#0d0c0a",
        "--cw-emotion-accent": "#1a1a1a",
        "--cw-emotion-blended": "#0d0c0a",
        "--cw-emotion-rgb": "13, 12, 10",
        "--cw-emotion-saturation": "0%",
        "--cw-transition-ms": "12000ms",
      });
      return;
    }
    if (!this.currentDominant) return;
    const scores = this.lastScores.length
      ? this.lastScores
      : [{ emotion: this.currentDominant, score: 100 }];
    const vars = buildCSSVars(
      this.currentDominant,
      this.currentBlend.length ? this.currentBlend : [this.currentDominant],
      scores,
      this.currentConfidence
    );
    this.emitColour(vars);
  }

  emitColour(vars) {
    this.onColourUpdate?.(vars);
  }
}
