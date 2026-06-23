import { buildPollinationsImageUrl } from "../lib/sceneImageUrl";

// API Configuration
export const defaultConfig = {
  enabled: false,
  apiKey: undefined,
  model: "llama-3.3-70b-versatile",
  maxTokens: 120,
};

// Fetch backend config on load
fetch("/api/config")
  .then((res) => {
    if (!res.ok) throw new Error("Config fetch failed");
    return res.json();
  })
  .then((data) => {
    defaultConfig.enabled = data.enabled;
    defaultConfig.apiKey = data.apiKey;
  })
  .catch((err) => {
    console.warn("[ChromaWrite] Could not fetch backend configuration:", err);
  });

// Image Configuration
export const imageConfig = {
  enabled: true,
  apiKey: undefined,
};

// 1. Custom Emotion Mapping
export async function mapCustomEmotion(rawLabel, config = defaultConfig) {
  try {
    const response = await fetch("/api/custom-emotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawLabel,
        apiKey: config.apiKey,
        model: config.model,
      }),
    });
    if (!response.ok) throw new Error("Custom emotion API call failed");
    return await response.json();
  } catch (err) {
    console.error("[ChromaWrite] Error mapping custom emotion:", err);
    return {
      rawLabel,
      mappedTo: "Melancholy",
      confidence: 0.4,
      source: "api",
    };
  }
}

// 2. Creative Nudge
export async function getTier2Nudge(recentText, dominant, config = defaultConfig) {
  try {
    const response = await fetch("/api/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recentText,
        dominant,
        apiKey: config.apiKey,
        model: config.model,
        apiEnabled: config.enabled,
      }),
    });
    if (!response.ok) throw new Error("Nudge API call failed");
    return await response.json();
  } catch (err) {
    console.error("[ChromaWrite] Error fetching nudge:", err);
    return null;
  }
}

// 3. Ambiguous Detection Refinement (called by session controller)
export async function refineDetection(recentText, topCandidates, config = defaultConfig) {
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: recentText,
        wordOffset: 0,
        apiKey: config.apiKey,
        model: config.model,
        apiEnabled: config.enabled,
      }),
    });
    if (!response.ok) throw new Error("Analyze API call failed");
    const data = await response.json();
    return data ? data.dominant : null;
  } catch (err) {
    console.error("[ChromaWrite] Error refining detection:", err);
    return null;
  }
}

// 4. Session Fingerprint
export async function generateFingerprint(
  dominantEmotion,
  shiftCount,
  wordCount,
  distribution,
  config = defaultConfig
) {
  try {
    const response = await fetch("/api/fingerprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dominantEmotion,
        shiftCount,
        wordCount,
        distribution,
        apiKey: config.apiKey,
        model: config.model,
        apiEnabled: config.enabled,
      }),
    });
    if (!response.ok) throw new Error("Fingerprint API call failed");
    return await response.json();
  } catch (err) {
    console.error("[ChromaWrite] Error generating fingerprint:", err);
    return null;
  }
}

// 5. Pollinations AI Scene Image Generation
export async function generateSceneImage(recentText, dominant, moodHex, storyTitle) {
  const words = recentText.trim().split(/\s+/).slice(-120).join(" ");
  const safeTitle = storyTitle.slice(0, 80);
  const prompt =
    `painterly literary illustration, "${safeTitle}", ` +
    `mood ${dominant}, palette ${moodHex}, ` +
    `${words.slice(0, 280)}, ` +
    `atmospheric literary art, no text, painterly`;

  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 999999);
  const url = buildPollinationsImageUrl(encoded, seed);

  // Send request asynchronously to log this generation on the python telemetry backend
  fetch("/api/log-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recentText,
      dominant,
      moodHex,
      storyTitle,
      url,
    }),
  }).catch((err) => console.warn("[ChromaWrite] Failed to log image generation:", err));

  return url;
}

// 6. Three Continuation Options
export async function getThreeContinuations(recentText, dominant, storyContext, config = defaultConfig) {
  try {
    const response = await fetch("/api/continuations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recentText,
        dominant,
        storyContext,
        apiKey: config.apiKey,
        model: config.model,
        apiEnabled: config.enabled,
      }),
    });
    if (!response.ok) throw new Error("Continuations API call failed");
    return await response.json();
  } catch (err) {
    console.error("[ChromaWrite] Error fetching continuations:", err);
    return null;
  }
}
