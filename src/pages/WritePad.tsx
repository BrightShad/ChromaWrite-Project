import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Clock, Type, ImageIcon, Sparkles, X, CheckCircle, Download, PenLine, Loader2, Pencil } from "lucide-react";
import { useChromaSession } from "@/engine/useChromaSession";
import { COLOUR_DICTIONARY } from "@/engine/colourDictionary";
import { mapCustomEmotion, getThreeContinuations, generateSceneImage, imageConfig, defaultConfig } from "@/api/claudeClient";
import { PRIMARY_EMOTIONS } from "@/types/emotion";
import type { PrimaryEmotion, CustomEmotionMapping, Suggestion } from "@/types/emotion";
import type { ArcSnapshot } from "@/engine/arcTracker";
import { saveStory, buildStoryFromSession, updateStoryCover } from "@/lib/storyStore";
import { useAuth } from "@/lib/useAuth";
import { sceneImageSrcForDisplay } from "@/lib/sceneImageUrl";
import {
  migrateLegacySceneGallery,
  splitSegments,
  joinSegments,
  insertedAtFromSegments,
  type SceneImageEntry,
} from "@/lib/storySegments";

interface WritePadState {
  mood: string;
  moodHsl: string;
  title: string;
  description?: string;
  wordLimit?: number;
  storyId?: string;
  existingContent?: string;
  existingElapsed?: number;
  existingArcPoints?: Array<{ dominant: string; confidence: number; wordOffset: number; timestamp: number }>;
  existingSceneGallery?: Array<{ url: string; mood: string; timestamp: number; insertedAt?: number }>;
}

function resolveMood(name: string): PrimaryEmotion | "neutral" | CustomEmotionMapping {
  const match = PRIMARY_EMOTIONS.find(e => e.toLowerCase() === name.toLowerCase());
  if (match) return match;
  if (name.toLowerCase() === "neutral") return "neutral";
  return "neutral";
}

// ── PDF Export ─────────────────────────────────────────────────────────────────
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to load image for PDF", e);
    // If proxy failed, try the direct URL as a last-ditch fallback
    if (url.startsWith("/pollinations")) {
      const clean = url.replace("/pollinations", "https://image.pollinations.ai");
      try {
        const res = await fetch(clean);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch { return null; }
    }
    return null;
  }
};

async function exportAsPDF(title: string, content: string, authorName: string, sceneImages?: Array<{ url: string; insertedAt?: number }>) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 25;
    const maxW = pageW - margin * 2;

    // White page
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, 297, "F");

    // Title
    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "italic");
    doc.setFontSize(26);
    doc.text(title, margin, 38);

    // Author
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Written by ${authorName}`, margin, 50);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 55, pageW - margin, 55);

    // Body
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    let y = 66;

    const sortedImages = (sceneImages || [])
      .filter(img => img.insertedAt !== undefined)
      .sort((a, b) => a.insertedAt! - b.insertedAt!);

    let lastIdx = 0;
    const textSegments = [];
    const imageSegments = [];

    for (const img of sortedImages) {
      const idx = img.insertedAt!;
      textSegments.push(content.slice(lastIdx, idx));
      imageSegments.push(img);
      lastIdx = idx;
    }
    textSegments.push(content.slice(lastIdx));

    for (let s = 0; s < textSegments.length; s++) {
      const lines = doc.splitTextToSize(textSegments[s].trim() + "\n", maxW);
      for (const line of lines) {
        if (y + 7 > 277) {
          doc.addPage();
          doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageW, 297, "F");
          doc.setTextColor(30, 30, 30); y = margin;
        }
        doc.text(line, margin, y); y += 7;
      }

      // Draw matched image
      const img = imageSegments[s];
      if (img) {
        const base64 = await fetchImageAsBase64(img.url);
        if (base64) {
          const imgH = maxW * (680 / 512); // Portrait aspect ratio matching generateSceneImage
          if (y + imgH + 10 > 277) { doc.addPage(); y = margin; }
          else { y += 5; } // pad top

          // Remove 'JPEG' to let jsPDF auto-detect format (often PNG from Pollinations)
          try {
            doc.addImage(base64, "PNG", margin, y, maxW, imgH, undefined, "FAST");
          } catch (e) {
            // Fallback to JPEG if it truly is one or auto-detect failed
            doc.addImage(base64, "JPEG", margin, y, maxW, imgH);
          }
          y += imgH + 15; // pad bottom
        }
      }
    }

    const pc = doc.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
      doc.text(`${title} · ${i} / ${pc}`, pageW / 2, 290, { align: "center" });
    }
    doc.save(`${(title || "story").replace(/\s+/g, "_")}.pdf`);
  } catch (err) {
    console.error("[PDF]", err);
    alert("PDF failed. Run: npm install jspdf");
  }
}

// ── Continuation Option Card ────────────────────────────────────────────────────
const ContinuationCard = ({ text, accent, onPick }: {
  text: string; accent: string; onPick: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}
    onClick={onPick}
    className="cursor-pointer border border-foreground/10 rounded p-4 bg-background/50 hover:bg-background/80 transition-all group"
    style={{ borderLeftColor: accent, borderLeftWidth: "2px" }}
  >
    <p className="font-serif text-[17px] italic text-foreground/65 leading-relaxed group-hover:text-foreground/85 transition-colors">
      {text}
    </p>
    <p className="font-mono text-[11px] text-foreground/25 mt-2 uppercase tracking-widest group-hover:text-foreground/40">
      tap to add →
    </p>
  </motion.div>
);

// ── Suggestion Pill ────────────────────────────────────────────────────────────
const SuggestionPill = ({ message, tier, onDismiss, accent }: {
  message: string; tier: number; onDismiss: () => void; accent: string;
}) => (
  <motion.div
    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
    className="border border-foreground/10 rounded p-4 bg-background/50"
    style={{ borderLeftColor: accent, borderLeftWidth: "2px" }}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="font-serif text-[16px] italic text-foreground/65 leading-snug flex-1">{message}</p>
      <button onClick={onDismiss} className="text-foreground/25 hover:text-foreground/60 flex-shrink-0 mt-0.5">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
    {tier === 2 && <p className="font-mono text-[9px] text-foreground/25 mt-2 uppercase tracking-widest">emotion signal</p>}
  </motion.div>
);

// ── Main ───────────────────────────────────────────────────────────────────────
const WritePad = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = (location.state as WritePadState) || { mood: "Curiosity", moodHsl: "174 50% 45%", title: "Untitled" };

  const storyIdRef = useRef(state.storyId ?? `story_${Date.now()}`);
  const authorName = user?.email?.split("@")[0] ?? "writer";

  const [startingEmotion, setStartingEmotion] = useState<PrimaryEmotion | "neutral" | CustomEmotionMapping>(
    resolveMood(state.mood)
  );

  useEffect(() => {
    const isPrimary = PRIMARY_EMOTIONS.some(e => e.toLowerCase() === state.mood.toLowerCase());
    if (!isPrimary && state.mood.toLowerCase() !== "neutral") {
      mapCustomEmotion(state.mood, defaultConfig).then(setStartingEmotion);
    }
  }, [state.mood]);

  const {
    cssVars,
    suggestions, imageBar, prompterBar, dominant, blend, wordCount,
    getArcPoints, onTextChange, dismissSuggestion, consumeImage, consumePrompter, finishSession,
  } = useChromaSession({
    storyId: storyIdRef.current,
    startingEmotion,
    previousArcPoints: state.existingArcPoints,
  });

  // Restore session — segments + scene images (images sit between text blocks; typing continues below each image)
  const [elapsedMinutes, setElapsed] = useState(state.existingElapsed ?? 0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showFinishFlood, setShowFlood] = useState(false);
  const [activeTab, setActiveTab] = useState<"story" | "gallery" | "stats">("story");
  const [sceneImages, setSceneImages] = useState<SceneImageEntry[]>(() =>
    migrateLegacySceneGallery(state.existingContent ?? "", state.existingSceneGallery ?? [])
  );
  const [segments, setSegments] = useState<string[]>(() => {
    const c = state.existingContent ?? "";
    const imgs = migrateLegacySceneGallery(c, state.existingSceneGallery ?? []);
    return splitSegments(c, imgs);
  });
  const [generatingImg, setGenerating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionSnapshot, setSnapshot] = useState<ArcSnapshot | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [exportingPDF, setExporting] = useState(false);
  const [continuations, setContinuations] = useState<string[] | null>(null);
  const [loadingNudge, setLoadingNudge] = useState(false);
  const [storyTitle, setStoryTitle] = useState(state.title || "Untitled");
  const [editingTitle, setEditingTitle] = useState(false);

  const fullText = useMemo(() => joinSegments(segments), [segments]);
  const contentRef = useRef(fullText);
  contentRef.current = fullText;

  const sceneGalleryForSave = useMemo(() => {
    const ins = insertedAtFromSegments(segments);
    return sceneImages.map((img, i) => ({
      ...img,
      insertedAt: ins[i] ?? img.insertedAt,
    }));
  }, [segments, sceneImages]);

  // Sync engine with full story text whenever segments change
  const skipChargeRef = useRef(false);

  useEffect(() => {
    onTextChange(fullText, skipChargeRef.current);
    skipChargeRef.current = false;
  }, [fullText, onTextChange]);

  // Timer — continues from where left off
  useEffect(() => {
    const i = setInterval(() => setElapsed(e => e + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  const updateSegment = useCallback((index: number, val: string) => {
    setSegments(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  }, []);

  const handleChangeSegment = useCallback((index: number, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSegment(index, e.target.value);
  }, [updateSegment]);

  const handleKeyDownSegment = useCallback((index: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;
    const seg = segments[index] ?? "";
    e.preventDefault();
    const t = e.target as HTMLTextAreaElement;
    const s = t.selectionStart, en = t.selectionEnd;
    const next = seg.substring(0, s) + "    " + seg.substring(en);
    updateSegment(index, next);
    setTimeout(() => { t.selectionStart = t.selectionEnd = s + 4; }, 0);
  }, [segments, updateSegment]);

  // Image generation — new text block opens below the image
  const handleImageBar = useCallback(async () => {
    if (imageBar < 100) return;
    if (!consumeImage()) return;
    setGenerating(true);
    try {
      const entry = dominant ? COLOUR_DICTIONARY[dominant] : null;
      const at = fullText.length;
      const url = await generateSceneImage(fullText, dominant ?? "Serenity", entry?.primary.hex ?? "#666", storyTitle);
      if (url) {
        const item: SceneImageEntry = { url, mood: dominant ?? "Serenity", timestamp: Date.now(), insertedAt: at };
        setSceneImages(prev => [...prev, item]);
        setSegments(prev => [...prev, ""]);
      }
    } finally { setGenerating(false); }
  }, [imageBar, consumeImage, dominant, storyTitle, fullText]);

  // Three continuations — user picks one and it appends
  const handlePrompterBar = useCallback(async () => {
    if (prompterBar < 100) return;
    if (!defaultConfig.enabled) {
      alert("Add VITE_GROQ_API_KEY to .env — free key at console.groq.com");
      return;
    }
    if (!consumePrompter()) return;
    setLoadingNudge(true);
    setContinuations(null);
    const options = await getThreeContinuations(
      contentRef.current, dominant ?? "Serenity",
      contentRef.current.slice(0, 500), defaultConfig
    );
    setContinuations(options);
    setLoadingNudge(false);
  }, [prompterBar, consumePrompter, dominant]);

  // Append chosen continuation to story
  const pickContinuation = useCallback((text: string) => {
    skipChargeRef.current = true;
    const current = contentRef.current;
    const separator = current.trimEnd().endsWith(".") || current.trimEnd().endsWith("?") || current.trimEnd().endsWith("!") ? " " : ". ";
    const next = current.trimEnd() + separator + text;
    setSegments(splitSegments(next, sceneImages));
    setContinuations(null);
  }, [sceneImages]);

  // Finish
  const handleFinish = useCallback(async () => {
    if (wordCount < 5 || isFinishing || isFinished) return;
    setIsFinishing(true);
    setShowFlood(true);
    const { snapshot, fingerprint: fp } = await finishSession();
    setSnapshot(snapshot);
    setFingerprint(fp);
    const allPoints = getArcPoints(); // full cumulative arc
    const arcColors = allPoints.length > 0
      ? allPoints.slice(-8).map(p => COLOUR_DICTIONARY[p.dominant as PrimaryEmotion]?.primary.hex ?? "#555")
      : snapshot.points.slice(-8).map(p => COLOUR_DICTIONARY[p.dominant]?.primary.hex ?? "#555");
    await saveStory(buildStoryFromSession({
      id: storyIdRef.current,
      title: storyTitle || "Untitled",
      content: fullText,
      mood: snapshot.dominantOverall ?? dominant ?? state.mood,
      wordCount,
      arcColors,
      fingerprint: fp ?? undefined,
      userId: user?.id,
      elapsedMinutes,
      savedArcPoints: allPoints.length > 0 ? allPoints : snapshot.points,
      sceneGallery: sceneGalleryForSave,
    }));
    setTimeout(() => {
      setShowFlood(false); setIsFinishing(false);
      setIsFinished(true); setActiveTab("stats");
    }, 2000);
  }, [finishSession, wordCount, isFinishing, isFinished, storyTitle, state.mood, dominant, user?.id, elapsedMinutes, fullText, sceneGalleryForSave]);

  // Save progress on every content change (debounced 3s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (wordCount < 5) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Save full cumulative arc (previous + current session points)
      const currentPoints = getArcPoints();
      saveStory(buildStoryFromSession({
        id: storyIdRef.current,
        title: storyTitle || "Untitled",
        content: fullText,
        mood: dominant ?? state.mood,
        wordCount,
        elapsedMinutes,
        userId: user?.id,
        savedArcPoints: currentPoints.length > 0 ? currentPoints : (state.existingArcPoints ?? []),
        sceneGallery: sceneGalleryForSave,
      }));
    }, 3000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [fullText, wordCount, dominant, elapsedMinutes, sceneGalleryForSave, storyTitle]); // eslint-disable-line

  // PDF export
  const handleExport = useCallback(async () => {
    if (exportingPDF || wordCount < 1) return;
    setExporting(true);
    await exportAsPDF(storyTitle || "Untitled", contentRef.current, authorName, sceneImages);
    setExporting(false);
  }, [exportingPDF, wordCount, storyTitle, authorName, sceneImages]);

  const handleSetCover = async (url: string) => {
    try {
      await updateStoryCover(storyIdRef.current, url);
      toast.success("Cover image updated!");
    } catch (e) {
      toast.error("Failed to update cover image.");
    }
  };

  const colourEntry = dominant ? COLOUR_DICTIONARY[dominant] : null;
  const moodAccent =
    cssVars["--cw-emotion-blended"] ??
    cssVars["--cw-emotion-primary"] ??
    colourEntry?.primary.hex ??
    `hsl(${state.moodHsl})`;
  const moodRgb =
    cssVars["--cw-emotion-rgb"] ??
    (colourEntry ? colourEntry.primary.rgb.join(", ") : "80,160,160");
  const activeSuggestions = suggestions.filter((s: Suggestion) => !s.dismissed).slice(0, 2);

  return (
    <div className="h-screen overflow-hidden relative flex flex-col">

      {/* Finish flood */}
      <AnimatePresence>
        {showFinishFlood && (
          <motion.div className="fixed inset-0 z-[200] pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 0.82 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }} style={{ backgroundColor: moodAccent }} />
        )}
      </AnimatePresence>

      {/* Living ambient — CSS transition, re-renders with dominant state changes */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 35% 45%, rgba(${moodRgb},0.14) 0%, transparent 60%), radial-gradient(ellipse at 70% 65%, rgba(${moodRgb},0.08) 0%, transparent 55%), hsl(var(--background))`,
          transition: "background 6s ease",
        }} />

      {/* Grain */}
      <div className="fixed inset-0 z-[1] opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "256px 256px" }} />

      {/* ── HEADER ── always visible, never fades */}
      <header className="sticky top-0 z-50 bg-background/30 backdrop-blur-xl flex-shrink-0 border-b border-foreground/8">
        {/* Mood ribbon — 3px prominent */}
        <div className="h-[3px] w-full"
          style={{ background: `linear-gradient(to right, transparent 0%, rgba(${moodRgb},0.35) 25%, rgba(${moodRgb},0.5) 50%, rgba(${moodRgb},0.35) 75%, transparent 100%)`, transition: "background 4s ease" }} />

        <div className="flex items-center gap-4 px-5 py-3">
          {/* Back + title */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <button onClick={() => navigate("/")} className="p-1.5 text-foreground/50 hover:text-foreground/80 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {editingTitle ? (
                  <input
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
                    className="font-serif text-[17px] italic text-foreground/90 bg-background/40 border border-foreground/20 rounded px-2 py-0.5 outline-none focus:border-foreground/40 w-full max-w-[min(100%,20rem)]"
                    autoFocus
                    aria-label="Story title"
                  />
                ) : (
                  <>
                    <h1 className="font-serif text-[19px] italic text-foreground/90 truncate leading-tight">{storyTitle}</h1>
                    <button
                      type="button"
                      onClick={() => setEditingTitle(true)}
                      className="p-1 rounded-sm text-foreground/35 hover:text-foreground/70 hover:bg-foreground/10 transition-colors flex-shrink-0"
                      aria-label="Rename story"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="font-mono text-[12px] mt-0.5 font-medium" style={{ color: moodAccent, transition: "color 3s ease" }}>
                {blend && blend.length > 0 ? blend.join(' · ') : (dominant ?? state.mood)}
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-0.5 bg-background/40 rounded border border-foreground/8 px-1 py-1 mx-auto">
            {(["story", "gallery", "stats"] as const).map(tab => {
              const disabled = tab === "stats" && !isFinished;
              const icons = { story: PenLine, gallery: ImageIcon, stats: Type };
              const Icon = icons[tab];
              return (
                <button key={tab}
                  onClick={() => {
                    if (disabled) {
                      toast.error("Finish your session to generate your final emotional statistics.");
                      return;
                    }
                    setActiveTab(tab);
                  }}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all ${activeTab === tab ? "bg-foreground/10 font-medium" : disabled ? "opacity-30 cursor-not-allowed" : "text-foreground/50 hover:text-foreground/80"
                    }`}
                  style={activeTab === tab ? { color: moodAccent } : {}}>
                  <Icon className="h-3.5 w-3.5" />
                  {tab}
                  {tab === "stats" && disabled && <span className="text-[8px] opacity-40">(finish first)</span>}
                </button>
              );
            })}
          </div>

          {/* Stats + actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="flex items-center gap-3 font-mono text-sm text-foreground/60">
              <span className="flex items-center gap-1.5"><Type className="h-4 w-4" />{wordCount.toLocaleString()}w</span>
              <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{elapsedMinutes}m</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
              style={{ backgroundColor: moodAccent, boxShadow: `0 0 8px rgba(${moodRgb},0.38)`, transition: "all 8s ease" }} />
            <button onClick={handleExport} disabled={exportingPDF || wordCount < 1}
              className="flex items-center gap-1.5 rounded-[2px] border border-foreground/20 px-3 py-1.5 font-mono text-[13px] text-foreground/70 hover:text-foreground transition-all disabled:opacity-30">
              {exportingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export PDF
            </button>
            <button onClick={handleFinish} disabled={isFinishing || wordCount < 5 || isFinished}
              className="flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-mono text-[13px] transition-all disabled:opacity-30"
              style={{ borderColor: `rgba(${moodRgb},0.6)`, color: moodAccent }}>
              <CheckCircle className="h-4 w-4" />
              {isFinished ? "Saved ✓" : isFinishing ? "Saving…" : "Finish"}
            </button>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="relative z-[2] flex flex-1 items-stretch min-h-0 overflow-hidden">

        {/* CENTRE: writing canvas */}
        <div className="flex-1 flex justify-center min-w-0 overflow-y-auto">
          <div className="w-full max-w-3xl min-w-0 px-4 sm:px-8 lg:px-10 py-10 sm:py-14">
            <AnimatePresence mode="wait">

              {/* Story tab */}
              {activeTab === "story" && (
                <motion.div key="story" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="relative space-y-6">
                    <AnimatePresence>
                      {fullText.length === 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute top-0 left-0 pointer-events-none select-none w-full z-0">
                          <p className="font-serif text-3xl italic leading-relaxed" style={{ color: `rgba(${moodRgb},0.12)` }}>
                            Begin your story...
                          </p>
                          <p className="font-mono text-sm mt-4" style={{ color: `rgba(${moodRgb},0.08)` }}>
                            The colours shift as your words paint the emotional landscape.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {segments.map((seg, i) => (
                      <div key={`block-${i}`} className="relative">
                        {/* Hidden sizing div to auto-expand parent without scroll jumps */}
                        <div
                          className="w-full invisible whitespace-pre-wrap break-words"
                          style={{
                            minHeight: i === segments.length - 1 ? "min(72vh, 520px)" : "3rem",
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontSize: "24px",
                            lineHeight: "2.0",
                            letterSpacing: "0.01em",
                            paddingBottom: "1.5rem"
                          }}
                        >
                          {seg + " "}
                        </div>
                        <textarea
                          value={seg}
                          onChange={(e) => handleChangeSegment(i, e)}
                          onKeyDown={(e) => handleKeyDownSegment(i, e)}
                          className="absolute inset-0 w-full h-full bg-transparent outline-none resize-none caret-primary selection:bg-primary/20 z-[1] overflow-hidden"
                          style={{
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontSize: "24px",
                            lineHeight: "2.0",
                            color: "hsl(var(--foreground))",
                            opacity: 0.92,
                            letterSpacing: "0.01em",
                          }}
                          autoFocus={i === segments.length - 1}
                          spellCheck
                        />
                        {i < sceneImages.length && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.45 }}
                            className="relative rounded overflow-hidden border border-foreground/8 mt-6"
                          >
                            <img
                              src={sceneImageSrcForDisplay(sceneImages[i].url)}
                              alt="Scene"
                              className="w-full object-cover max-h-80 bg-foreground/5"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-background/70 backdrop-blur-sm px-4 py-2">
                              <p className="font-mono text-[9px] text-foreground/40 uppercase tracking-wider">
                                {sceneImages[i].mood} · Generated scene
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>


                </motion.div>
              )}

              {/* Gallery tab */}
              {activeTab === "gallery" && (
                <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <p className="font-mono text-xs uppercase tracking-wider text-foreground/30 mb-6">
                    Generated Scenes — {sceneImages.length} image{sceneImages.length !== 1 ? "s" : ""}
                  </p>
                  {generatingImg && (
                    <div className="flex items-center gap-3 py-8">
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: moodAccent }} />
                      <p className="font-serif italic text-foreground/40">Generating scene…</p>
                    </div>
                  )}
                  {sceneImages.length === 0 && !generatingImg && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <ImageIcon className="h-8 w-8 text-foreground/12" />
                      <p className="font-serif italic text-foreground/30 text-center max-w-xs">
                        Write ~40 words to charge the Scene Vision bar, then tap it.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {sceneImages.map((img, i) => (
                      <div key={`${img.timestamp}-${i}`} className="rounded overflow-hidden border border-foreground/8 group relative">
                        <img
                          src={sceneImageSrcForDisplay(img.url)}
                          alt={`Scene ${i + 1}`}
                          className="w-full object-cover max-h-96 bg-foreground/5"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                          <p className="font-mono text-[9px] text-foreground/50">{img.mood} · {new Date(img.timestamp).toLocaleTimeString()}</p>
                          <button
                            onClick={() => handleSetCover(img.url)}
                            className="font-mono text-[10px] text-foreground/70 hover:text-foreground bg-foreground/10 hover:bg-foreground/20 px-2 py-1 rounded transition-colors"
                          >
                            Set Cover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Stats tab */}
              {activeTab === "stats" && (
                <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  {sessionSnapshot ? (
                    <div className="space-y-6">
                      {fingerprint && (
                        <div className="border border-foreground/10 rounded p-5" style={{ borderLeftColor: moodAccent, borderLeftWidth: "2px" }}>
                          <p className="font-serif text-lg italic text-foreground/75 leading-relaxed">"{fingerprint}"</p>
                          <p className="font-mono text-xs text-foreground/25 mt-2 uppercase tracking-wider">emotional fingerprint</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Words", value: wordCount.toLocaleString() },
                          { label: "Session", value: `${elapsedMinutes}m` },
                          { label: "Mood shifts", value: String(sessionSnapshot.shiftCount ?? 0) },
                          { label: "Dominant", value: sessionSnapshot.dominantOverall ?? "—" },
                        ].map(s => (
                          <div key={s.label} className="border border-foreground/8 rounded p-4">
                            <p className="font-serif text-2xl italic text-foreground/80">{s.value}</p>
                            <p className="font-mono text-xs text-foreground/30 uppercase tracking-wider mt-1">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {sessionSnapshot.points.length > 0 && (
                        <div>
                          <p className="font-mono text-xs uppercase tracking-wider text-foreground/30 mb-3">Emotional Arc</p>
                          <div className="flex h-8 rounded overflow-hidden">
                            {sessionSnapshot.points.map((p, i) => {
                              const bgs = p.blendEmotions?.map(e => COLOUR_DICTIONARY[e]?.primary.hex).filter(Boolean);
                              const bgStyle = bgs && bgs.length > 1
                                ? { background: `linear-gradient(to right, ${bgs.join(', ')})` }
                                : { backgroundColor: COLOUR_DICTIONARY[p.dominant as PrimaryEmotion]?.primary.hex ?? "#555" };

                              return <div key={i} className="flex-1" style={bgStyle} />
                            })}
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="font-mono text-[10px] text-foreground/20">start</span>
                            <span className="font-mono text-[10px] text-foreground/20">end</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                      <p className="font-serif italic text-foreground/25 text-lg">Click Finish to generate your story stats.</p>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="w-[min(100%,24rem)] sm:w-[min(100%,26rem)] xl:w-[min(100%,28rem)] xl:max-w-[32vw] flex-shrink-0 border-l border-foreground/8 bg-background/15 flex flex-col gap-6 px-4 sm:px-6 py-6 sm:py-8 self-stretch overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: `rgba(${moodRgb},0.2) transparent` }}>

          {/* Resource bars */}
          <div className="space-y-5">
            <p className="font-mono text-xs uppercase tracking-wider text-foreground/30">Resources</p>

            {/* Scene Vision */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button onClick={handleImageBar} disabled={generatingImg}
                  className={`flex items-center gap-2 transition-all ${imageBar >= 100 && !generatingImg ? "cursor-pointer" : "cursor-default opacity-40"}`}>
                  {generatingImg
                    ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: moodAccent }} />
                    : <ImageIcon className="h-4 w-4" style={{ color: imageBar >= 100 ? moodAccent : "currentColor" }} />}
                  <span className="font-mono text-xs uppercase tracking-wide"
                    style={{ color: imageBar >= 100 && !generatingImg ? moodAccent : undefined }}>
                    {generatingImg ? "Generating…" : imageBar >= 100 ? "Generate Scene ✦" : "Scene Vision"}
                  </span>
                </button>
                <span className="font-mono text-xs text-foreground/30">{Math.round(imageBar)}%</span>
              </div>
              <div className="h-[2px] rounded-full bg-foreground/10 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: moodAccent }}
                  animate={{ width: `${imageBar}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
              </div>
            </div>

            {/* AI Continuations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button onClick={handlePrompterBar} disabled={loadingNudge}
                  className={`flex items-center gap-2 transition-all ${prompterBar >= 100 && !loadingNudge ? "cursor-pointer" : "cursor-default opacity-40"}`}>
                  {loadingNudge
                    ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: moodAccent }} />
                    : <Sparkles className="h-4 w-4" style={{ color: prompterBar >= 100 ? moodAccent : "currentColor" }} />}
                  <span className="font-mono text-xs uppercase tracking-wide"
                    style={{ color: prompterBar >= 100 && !loadingNudge ? moodAccent : undefined }}>
                    {loadingNudge ? "Writing options…" : prompterBar >= 100 ? "Get Continuations ✦" : "AI Writer"}
                  </span>
                </button>
                <span className="font-mono text-sm text-foreground/50">{Math.round(prompterBar)}%</span>
              </div>
              <div className="h-[2px] rounded-full bg-foreground/10 overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: moodAccent }}
                  animate={{ width: `${prompterBar}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
              </div>
            </div>

            {/* Continuation recommendations appended in sidebar inline */}
            <AnimatePresence>
              {continuations && (
                <motion.div initial={{ opacity: 0, height: 0, overflow: 'hidden' }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                  className="space-y-3 pt-2">
                  <p className="font-mono text-sm uppercase tracking-wider text-foreground/60 mb-2">
                    Available Continuations
                  </p>
                  {continuations.map((text, i) => (
                    <ContinuationCard key={i} text={text} accent={moodAccent} onPick={() => pickContinuation(text)} />
                  ))}
                  <button onClick={() => setContinuations(null)}
                    className="font-mono text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors mt-2 w-full text-left">
                    dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-px bg-foreground/8" />

          {/* Suggestions */}
          <div className="flex-1 space-y-3">
            <p className="font-mono text-sm uppercase tracking-wider text-foreground/50">
              Mood signals{activeSuggestions.length > 0 && ` · ${activeSuggestions.length}`}
            </p>
            <AnimatePresence>
              {activeSuggestions.map((s: Suggestion) => (
                <SuggestionPill key={s.id} message={s.message} tier={s.tier}
                  accent={moodAccent} onDismiss={() => dismissSuggestion(s.id)} />
              ))}
              {activeSuggestions.length === 0 && (
                <p className="font-serif italic text-[14px] text-foreground/20 leading-relaxed">
                  Signals appear as your emotional arc shifts…
                </p>
              )}
            </AnimatePresence>
          </div>

          <div className="h-px bg-foreground/8" />

          {/* Current mood */}
          <div className="space-y-2">
            <p className="font-mono text-sm uppercase tracking-wider text-foreground/50">Current Mood</p>
            <div className="flex items-center gap-2.5">
              <div className="w-3.5 h-3.5 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: moodAccent, transition: "background-color 8s ease" }} />
              <span className="font-serif italic text-xl" style={{ color: moodAccent, transition: "color 3s ease" }}>
                {blend && blend.length > 0 ? blend.join(' · ') : (dominant ?? "—")}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="relative z-[2] border-t border-foreground/5 bg-background/5 flex-shrink-0">
        <div className="flex items-center justify-between py-2 px-5">
          <p className="font-mono text-xs text-foreground/40">ChromaWrite · {authorName}</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: `rgba(${moodRgb},0.44)` }} />
            <p className="font-mono text-xs text-foreground/40">Colour engine · auto-saves every 3s</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WritePad;
