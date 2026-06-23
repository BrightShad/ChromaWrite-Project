import React from "react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Clock, Type, ImageIcon, Sparkles, X, CheckCircle, Download, PenLine, Loader2, Pencil } from "lucide-react";
import { useChromaSession } from "@/engine/useChromaSession";
import { COLOUR_DICTIONARY } from "@/engine/colourDictionary";
import { mapCustomEmotion, getThreeContinuations, generateSceneImage, defaultConfig } from "@/api/langchainClient";
import PipelineInspector from "@/components/PipelineInspector";
import { PRIMARY_EMOTIONS } from "@/types/emotion";
import { saveStory, buildStoryFromSession, updateStoryCover } from "@/lib/storyStore";
import { useAuth } from "@/lib/useAuth";
import { sceneImageSrcForDisplay } from "@/lib/sceneImageUrl";
import {
  migrateLegacySceneGallery,
  splitSegments,
  joinSegments,
  insertedAtFromSegments
} from "@/lib/storySegments";
function resolveMood(name) {
  const match = PRIMARY_EMOTIONS.find((e) => e.toLowerCase() === name.toLowerCase());
  if (match) return match;
  if (name.toLowerCase() === "neutral") return "neutral";
  return "neutral";
}
const fetchImageAsBase64 = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Failed to load image for PDF", e);
    if (url.startsWith("/pollinations")) {
      const clean = url.replace("/pollinations", "https://image.pollinations.ai");
      try {
        const res = await fetch(clean);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    }
    return null;
  }
};
async function exportAsPDF(title, content, authorName, sceneImages) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 25;
    const maxW = pageW - margin * 2;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, 297, "F");
    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "italic");
    doc.setFontSize(26);
    doc.text(title, margin, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Written by ${authorName}`, margin, 50);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 55, pageW - margin, 55);
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    let y = 66;
    const sortedImages = (sceneImages || []).filter((img) => img.insertedAt !== void 0).sort((a, b) => a.insertedAt - b.insertedAt);
    let lastIdx = 0;
    const textSegments = [];
    const imageSegments = [];
    for (const img of sortedImages) {
      const idx = img.insertedAt;
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
          doc.setFillColor(255, 255, 255);
          doc.rect(0, 0, pageW, 297, "F");
          doc.setTextColor(30, 30, 30);
          y = margin;
        }
        doc.text(line, margin, y);
        y += 7;
      }
      const img = imageSegments[s];
      if (img) {
        const base64 = await fetchImageAsBase64(img.url);
        if (base64) {
          const imgH = maxW * (10 / 16);
          if (y + imgH + 10 > 277) {
            doc.addPage();
            y = margin;
          } else {
            y += 5;
          }
          try {
            doc.addImage(base64, "PNG", margin, y, maxW, imgH, void 0, "FAST");
          } catch (e) {
            doc.addImage(base64, "JPEG", margin, y, maxW, imgH);
          }
          y += imgH + 15;
        }
      }
    }
    const pc = doc.getNumberOfPages();
    for (let i = 1; i <= pc; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${title} \xB7 ${i} / ${pc}`, pageW / 2, 290, { align: "center" });
    }
    doc.save(`${(title || "story").replace(/\s+/g, "_")}.pdf`);
  } catch (err) {
    console.error("[PDF]", err);
    alert("PDF failed. Run: npm install jspdf");
  }
}
const ContinuationCard = ({ text, accent, onPick }) => /* @__PURE__ */ React.createElement(
  motion.div,
  {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 },
    transition: { duration: 0.25 },
    onClick: onPick,
    className: "cursor-pointer border border-foreground/10 rounded p-4 bg-background/50 hover:bg-background/80 transition-all group",
    style: { borderLeftColor: accent, borderLeftWidth: "2px" }
  },
  /* @__PURE__ */ React.createElement("p", { className: "font-serif text-[17px] italic text-foreground/65 leading-relaxed group-hover:text-foreground/85 transition-colors" }, text),
  /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[11px] text-foreground/25 mt-2 uppercase tracking-widest group-hover:text-foreground/40" }, "tap to add \u2192")
);
const SuggestionPill = ({ message, tier, onDismiss, accent }) => /* @__PURE__ */ React.createElement(
  motion.div,
  {
    initial: { opacity: 0, x: 8 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.25 },
    className: "border border-foreground/10 rounded p-4 bg-background/50",
    style: { borderLeftColor: accent, borderLeftWidth: "2px" }
  },
  /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-[16px] italic text-foreground/65 leading-snug flex-1" }, message), /* @__PURE__ */ React.createElement("button", { onClick: onDismiss, className: "text-foreground/25 hover:text-foreground/60 flex-shrink-0 mt-0.5" }, /* @__PURE__ */ React.createElement(X, { className: "h-3.5 w-3.5" }))),
  tier === 2 && /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[9px] text-foreground/25 mt-2 uppercase tracking-widest" }, "emotion signal")
);
const WritePad = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state || { mood: "Curiosity", moodHsl: "174 50% 45%", title: "Untitled" };
  const storyIdRef = useRef(state.storyId ?? `story_${Date.now()}`);
  const authorName = user?.email?.split("@")[0] ?? "writer";
  const [startingEmotion, setStartingEmotion] = useState(
    resolveMood(state.mood)
  );
  useEffect(() => {
    const isPrimary = PRIMARY_EMOTIONS.some((e) => e.toLowerCase() === state.mood.toLowerCase());
    if (!isPrimary && state.mood.toLowerCase() !== "neutral") {
      mapCustomEmotion(state.mood, defaultConfig).then(setStartingEmotion);
    }
  }, [state.mood]);
  const {
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
    assistantState
  } = useChromaSession({
    storyId: storyIdRef.current,
    startingEmotion,
    previousArcPoints: state.existingArcPoints
  });
  const [elapsedMinutes, setElapsed] = useState(state.existingElapsed ?? 0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [showFinishFlood, setShowFlood] = useState(false);
  const [activeTab, setActiveTab] = useState("story");
  const [sceneImages, setSceneImages] = useState(
    () => migrateLegacySceneGallery(state.existingContent ?? "", state.existingSceneGallery ?? [])
  );
  const [segments, setSegments] = useState(() => {
    const c = state.existingContent ?? "";
    const imgs = migrateLegacySceneGallery(c, state.existingSceneGallery ?? []);
    return splitSegments(c, imgs);
  });
  const [generatingImg, setGenerating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [sessionSnapshot, setSnapshot] = useState(null);
  const [fingerprint, setFingerprint] = useState(null);
  const [exportingPDF, setExporting] = useState(false);
  const [continuations, setContinuations] = useState(null);
  const [loadingNudge, setLoadingNudge] = useState(false);
  const [storyTitle, setStoryTitle] = useState(state.title || "Untitled");
  const [editingTitle, setEditingTitle] = useState(false);
  const [showPipelineInspector, setShowInspector] = useState(false);
  const fullText = useMemo(() => joinSegments(segments), [segments]);
  const contentRef = useRef(fullText);
  contentRef.current = fullText;
  const sceneGalleryForSave = useMemo(() => {
    const ins = insertedAtFromSegments(segments);
    return sceneImages.map((img, i) => ({
      ...img,
      insertedAt: ins[i] ?? img.insertedAt
    }));
  }, [segments, sceneImages]);
  const skipChargeRef = useRef(false);
  useEffect(() => {
    onTextChange(fullText, skipChargeRef.current);
    skipChargeRef.current = false;
  }, [fullText, onTextChange]);
  useEffect(() => {
    const i = setInterval(() => setElapsed((e) => e + 1), 6e4);
    return () => clearInterval(i);
  }, []);
  const updateSegment = useCallback((index, val) => {
    setSegments((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  }, []);
  const handleChangeSegment = useCallback((index, e) => {
    updateSegment(index, e.target.value);
  }, [updateSegment]);
  const handleKeyDownSegment = useCallback((index, e) => {
    if (e.key !== "Tab") return;
    const seg = segments[index] ?? "";
    e.preventDefault();
    const t = e.target;
    const s = t.selectionStart, en = t.selectionEnd;
    const next = seg.substring(0, s) + "    " + seg.substring(en);
    updateSegment(index, next);
    setTimeout(() => {
      t.selectionStart = t.selectionEnd = s + 4;
    }, 0);
  }, [segments, updateSegment]);
  const handleImageBar = useCallback(async () => {
    if (imageBar < 100) return;
    if (!consumeImage()) return;
    setGenerating(true);
    try {
      const entry = dominant ? COLOUR_DICTIONARY[dominant] : null;
      const at = fullText.length;
      const url = await generateSceneImage(fullText, dominant ?? "Serenity", entry?.primary.hex ?? "#666", storyTitle);
      if (url) {
        const item = { url, mood: dominant ?? "Serenity", timestamp: Date.now(), insertedAt: at };
        setSceneImages((prev) => [...prev, item]);
        setSegments((prev) => [...prev, ""]);
      }
    } finally {
      setGenerating(false);
    }
  }, [imageBar, consumeImage, dominant, storyTitle, fullText]);
  const handlePrompterBar = useCallback(async () => {
    if (prompterBar < 100) return;
    if (!defaultConfig.enabled) {
      alert("Add VITE_GROQ_API_KEY to .env \u2014 free key at console.groq.com");
      return;
    }
    if (!consumePrompter()) return;
    setLoadingNudge(true);
    setContinuations(null);
    const options = await getThreeContinuations(
      contentRef.current,
      dominant ?? "Serenity",
      contentRef.current.slice(0, 500),
      defaultConfig
    );
    setContinuations(options);
    setLoadingNudge(false);
  }, [prompterBar, consumePrompter, dominant]);
  const pickContinuation = useCallback((text) => {
    skipChargeRef.current = true;
    const current = contentRef.current;
    const separator = current.trimEnd().endsWith(".") || current.trimEnd().endsWith("?") || current.trimEnd().endsWith("!") ? " " : ". ";
    const next = current.trimEnd() + separator + text;
    setSegments(splitSegments(next, sceneImages));
    setContinuations(null);
  }, [sceneImages]);
  const handleFinish = useCallback(async () => {
    if (wordCount < 5 || isFinishing || isFinished) return;
    setIsFinishing(true);
    setShowFlood(true);
    const { snapshot, fingerprint: fp } = await finishSession();
    setSnapshot(snapshot);
    setFingerprint(fp);
    const allPoints = getArcPoints();
    const arcColors = allPoints.length > 0 ? allPoints.slice(-8).map((p) => COLOUR_DICTIONARY[p.dominant]?.primary.hex ?? "#555") : snapshot.points.slice(-8).map((p) => COLOUR_DICTIONARY[p.dominant]?.primary.hex ?? "#555");
    await saveStory(buildStoryFromSession({
      id: storyIdRef.current,
      title: storyTitle || "Untitled",
      content: fullText,
      mood: snapshot.dominantOverall ?? dominant ?? state.mood,
      wordCount,
      arcColors,
      fingerprint: fp ?? void 0,
      userId: user?.id,
      elapsedMinutes,
      savedArcPoints: allPoints.length > 0 ? allPoints : snapshot.points,
      sceneGallery: sceneGalleryForSave
    }));
    setTimeout(() => {
      setShowFlood(false);
      setIsFinishing(false);
      setIsFinished(true);
      setActiveTab("stats");
    }, 2e3);
  }, [finishSession, wordCount, isFinishing, isFinished, storyTitle, state.mood, dominant, user?.id, elapsedMinutes, fullText, sceneGalleryForSave]);
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (wordCount < 5) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const currentPoints = getArcPoints();
      saveStory(buildStoryFromSession({
        id: storyIdRef.current,
        title: storyTitle || "Untitled",
        content: fullText,
        mood: dominant ?? state.mood,
        wordCount,
        elapsedMinutes,
        userId: user?.id,
        savedArcPoints: currentPoints.length > 0 ? currentPoints : state.existingArcPoints ?? [],
        sceneGallery: sceneGalleryForSave
      }));
    }, 3e3);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [fullText, wordCount, dominant, elapsedMinutes, sceneGalleryForSave, storyTitle]);
  const handleExport = useCallback(async () => {
    if (exportingPDF || wordCount < 1) return;
    setExporting(true);
    await exportAsPDF(storyTitle || "Untitled", contentRef.current, authorName, sceneImages);
    setExporting(false);
  }, [exportingPDF, wordCount, storyTitle, authorName, sceneImages]);
  const handleSetCover = async (url) => {
    try {
      await updateStoryCover(storyIdRef.current, url);
      toast.success("Cover image updated!");
    } catch (e) {
      toast.error("Failed to update cover image.");
    }
  };
  const colourEntry = dominant ? COLOUR_DICTIONARY[dominant] : null;
  const moodAccent = cssVars["--cw-emotion-blended"] ?? cssVars["--cw-emotion-primary"] ?? colourEntry?.primary.hex ?? `hsl(${state.moodHsl})`;
  const moodRgb = cssVars["--cw-emotion-rgb"] ?? (colourEntry ? colourEntry.primary.rgb.join(", ") : "80,160,160");
  const activeSuggestions = suggestions.filter((s) => !s.dismissed).slice(0, 2);
  return /* @__PURE__ */ React.createElement("div", { className: "h-screen overflow-hidden relative flex flex-col" }, /* @__PURE__ */ React.createElement(AnimatePresence, null, showFinishFlood && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "fixed inset-0 z-[200] pointer-events-none",
      initial: { opacity: 0 },
      animate: { opacity: 0.82 },
      exit: { opacity: 0 },
      transition: { duration: 0.9 },
      style: { backgroundColor: moodAccent }
    }
  )), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-0 pointer-events-none",
      style: {
        background: `radial-gradient(ellipse at 35% 45%, rgba(${moodRgb},0.14) 0%, transparent 60%), radial-gradient(ellipse at 70% 65%, rgba(${moodRgb},0.08) 0%, transparent 55%), hsl(var(--background))`,
        transition: "background 6s ease"
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[1] opacity-[0.04] pointer-events-none",
      style: { backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "256px 256px" }
    }
  ), /* @__PURE__ */ React.createElement("header", { className: "sticky top-0 z-50 bg-background/30 backdrop-blur-xl flex-shrink-0 border-b border-foreground/8" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-[3px] w-full",
      style: { background: `linear-gradient(to right, transparent 0%, rgba(${moodRgb},0.35) 25%, rgba(${moodRgb},0.5) 50%, rgba(${moodRgb},0.35) 75%, transparent 100%)`, transition: "background 4s ease" }
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 px-5 py-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0 flex-shrink-0" }, /* @__PURE__ */ React.createElement("button", { onClick: () => navigate("/"), className: "p-1.5 text-foreground/50 hover:text-foreground/80 transition-colors" }, /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-5 w-5" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5 min-w-0" }, editingTitle ? /* @__PURE__ */ React.createElement(
    "input",
    {
      value: storyTitle,
      onChange: (e) => setStoryTitle(e.target.value),
      onBlur: () => setEditingTitle(false),
      onKeyDown: (e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      },
      className: "font-serif text-[17px] italic text-foreground/90 bg-background/40 border border-foreground/20 rounded px-2 py-0.5 outline-none focus:border-foreground/40 w-full max-w-[min(100%,20rem)]",
      autoFocus: true,
      "aria-label": "Story title"
    }
  ) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h1", { className: "font-serif text-[19px] italic text-foreground/90 truncate leading-tight" }, storyTitle), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: () => setEditingTitle(true),
      className: "p-1 rounded-sm text-foreground/35 hover:text-foreground/70 hover:bg-foreground/10 transition-colors flex-shrink-0",
      "aria-label": "Rename story"
    },
    /* @__PURE__ */ React.createElement(Pencil, { className: "h-3.5 w-3.5" })
  ))), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[12px] mt-0.5 font-medium", style: { color: moodAccent, transition: "color 3s ease" } }, blend && blend.length > 0 ? blend.join(" \xB7 ") : dominant ?? state.mood))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-0.5 bg-background/40 rounded border border-foreground/8 px-1 py-1 mx-auto" }, ["story", "gallery", "stats"].map((tab) => {
    const disabled = tab === "stats" && !isFinished;
    const icons = { story: PenLine, gallery: ImageIcon, stats: Type };
    const Icon = icons[tab];
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: tab,
        onClick: () => {
          if (disabled) {
            window.alert("Please finish your session first to generate your emotional statistics.");
            return;
          }
          setActiveTab(tab);
        },
        className: `flex items-center gap-2 px-4 py-1.5 rounded-sm font-mono text-xs uppercase tracking-wider transition-all ${activeTab === tab ? "bg-foreground/10 font-medium" : disabled ? "opacity-30 cursor-not-allowed" : "text-foreground/50 hover:text-foreground/80"}`,
        style: activeTab === tab ? { color: moodAccent } : {}
      },
      /* @__PURE__ */ React.createElement(Icon, { className: "h-3.5 w-3.5" }),
      tab,
      tab === "stats" && disabled && /* @__PURE__ */ React.createElement("span", { className: "text-[8px] opacity-40" }, "(finish first)")
    );
  })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 font-mono text-sm text-foreground/60" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Type, { className: "h-4 w-4" }), wordCount.toLocaleString(), "w"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Clock, { className: "h-4 w-4" }), elapsedMinutes, "m")), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0",
      style: { backgroundColor: moodAccent, boxShadow: `0 0 8px rgba(${moodRgb},0.38)`, transition: "all 8s ease" }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowInspector((p) => !p),
      className: `flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-mono text-[13px] transition-all ${showPipelineInspector ? "bg-foreground/10 text-foreground border-foreground/30 font-medium" : "border-foreground/20 text-foreground/70 hover:text-foreground"}`
    },
    "Pipeline Inspector"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleExport,
      disabled: exportingPDF || wordCount < 1,
      className: "flex items-center gap-1.5 rounded-[2px] border border-foreground/20 px-3 py-1.5 font-mono text-[13px] text-foreground/70 hover:text-foreground transition-all disabled:opacity-30"
    },
    exportingPDF ? /* @__PURE__ */ React.createElement(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ React.createElement(Download, { className: "h-4 w-4" }),
    "Export PDF"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleFinish,
      disabled: isFinishing || wordCount < 5 || isFinished,
      className: "flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-mono text-[13px] transition-all disabled:opacity-30",
      style: { borderColor: `rgba(${moodRgb},0.6)`, color: moodAccent }
    },
    /* @__PURE__ */ React.createElement(CheckCircle, { className: "h-4 w-4" }),
    isFinished ? "Saved \u2713" : isFinishing ? "Saving\u2026" : "Finish"
  )))), /* @__PURE__ */ React.createElement("div", { className: "relative z-[2] flex flex-1 items-stretch min-h-0 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex justify-center min-w-0 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-3xl min-w-0 px-4 sm:px-8 lg:px-10 py-10 sm:py-14" }, /* @__PURE__ */ React.createElement(AnimatePresence, { mode: "wait" }, activeTab === "story" && /* @__PURE__ */ React.createElement(motion.div, { key: "story", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }, /* @__PURE__ */ React.createElement("div", { className: "relative space-y-6" }, /* @__PURE__ */ React.createElement(AnimatePresence, null, fullText.length === 0 && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      className: "absolute top-0 left-0 pointer-events-none select-none w-full z-0"
    },
    /* @__PURE__ */ React.createElement("p", { className: "font-serif text-3xl italic leading-relaxed", style: { color: `rgba(${moodRgb},0.12)` } }, "Begin your story..."),
    /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm mt-4", style: { color: `rgba(${moodRgb},0.08)` } }, "The colours shift as your words paint the emotional landscape.")
  )), segments.map((seg, i) => /* @__PURE__ */ React.createElement("div", { key: `block-${i}`, className: "relative" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-full invisible whitespace-pre-wrap break-words",
      style: {
        minHeight: i === segments.length - 1 ? "min(72vh, 520px)" : "3rem",
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "24px",
        lineHeight: "2.0",
        letterSpacing: "0.01em",
        paddingBottom: "1.5rem"
      }
    },
    seg + " "
  ), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: seg,
      onChange: (e) => handleChangeSegment(i, e),
      onKeyDown: (e) => handleKeyDownSegment(i, e),
      className: "absolute inset-0 w-full h-full bg-transparent outline-none resize-none caret-primary selection:bg-primary/20 z-[1] overflow-hidden",
      style: {
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "24px",
        lineHeight: "2.0",
        color: "hsl(var(--foreground))",
        opacity: 0.92,
        letterSpacing: "0.01em"
      },
      autoFocus: i === segments.length - 1,
      spellCheck: true
    }
  ), i < sceneImages.length && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0, scale: 0.98 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.45 },
      className: "relative rounded overflow-hidden border border-foreground/8 mt-6"
    },
    /* @__PURE__ */ React.createElement(
      "img",
      {
        src: sceneImageSrcForDisplay(sceneImages[i].url),
        alt: "Scene",
        className: "w-full aspect-[16/10] object-cover bg-foreground/5",
        referrerPolicy: "no-referrer",
        loading: "lazy",
        decoding: "async"
      }
    ),
    /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-0 left-0 right-0 bg-background/70 backdrop-blur-sm px-4 py-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[9px] text-foreground/40 uppercase tracking-wider" }, sceneImages[i].mood, " \xB7 Generated scene"))
  ))))), activeTab === "gallery" && /* @__PURE__ */ React.createElement(motion.div, { key: "gallery", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs uppercase tracking-wider text-foreground/30 mb-6" }, "Generated Scenes \u2014 ", sceneImages.length, " image", sceneImages.length !== 1 ? "s" : ""), generatingImg && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 py-8" }, /* @__PURE__ */ React.createElement(Loader2, { className: "h-5 w-5 animate-spin", style: { color: moodAccent } }), /* @__PURE__ */ React.createElement("p", { className: "font-serif italic text-foreground/40" }, "Generating scene\u2026")), sceneImages.length === 0 && !generatingImg && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-24 gap-4" }, /* @__PURE__ */ React.createElement(ImageIcon, { className: "h-8 w-8 text-foreground/12" }), /* @__PURE__ */ React.createElement("p", { className: "font-serif italic text-foreground/30 text-center max-w-xs" }, "Write ~40 words to charge the Scene Vision bar, then tap it.")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, sceneImages.map((img, i) => /* @__PURE__ */ React.createElement("div", { key: `${img.timestamp}-${i}`, className: "rounded overflow-hidden border border-foreground/8 group relative" }, /* @__PURE__ */ React.createElement(
    "img",
    {
      src: sceneImageSrcForDisplay(img.url),
      alt: `Scene ${i + 1}`,
      className: "w-full aspect-[16/10] object-cover bg-foreground/5",
      referrerPolicy: "no-referrer",
      loading: "lazy",
      decoding: "async"
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-0 left-0 right-0 bg-background/80 px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[9px] text-foreground/50" }, img.mood, " \xB7 ", new Date(img.timestamp).toLocaleTimeString()), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => handleSetCover(img.url),
      className: "font-mono text-[10px] text-foreground/70 hover:text-foreground bg-foreground/10 hover:bg-foreground/20 px-2 py-1 rounded transition-colors"
    },
    "Set Cover"
  )))))), activeTab === "stats" && /* @__PURE__ */ React.createElement(motion.div, { key: "stats", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 } }, sessionSnapshot ? /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, fingerprint && /* @__PURE__ */ React.createElement("div", { className: "border border-foreground/10 rounded p-5", style: { borderLeftColor: moodAccent, borderLeftWidth: "2px" } }, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-lg italic text-foreground/75 leading-relaxed" }, '"', fingerprint, '"'), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/25 mt-2 uppercase tracking-wider" }, "emotional fingerprint")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, [
    { label: "Words", value: wordCount.toLocaleString() },
    { label: "Session", value: `${elapsedMinutes}m` },
    { label: "Mood shifts", value: String(sessionSnapshot.shiftCount ?? 0) },
    { label: "Dominant", value: sessionSnapshot.dominantOverall ?? "\u2014" }
  ].map((s) => /* @__PURE__ */ React.createElement("div", { key: s.label, className: "border border-foreground/8 rounded p-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-2xl italic text-foreground/80" }, s.value), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/30 uppercase tracking-wider mt-1" }, s.label)))), sessionSnapshot.points.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs uppercase tracking-wider text-foreground/30 mb-3" }, "Emotional Arc"), /* @__PURE__ */ React.createElement("div", { className: "flex h-8 rounded overflow-hidden" }, sessionSnapshot.points.map((p, i) => {
    const bgs = p.blendEmotions?.map((e) => COLOUR_DICTIONARY[e]?.primary.hex).filter(Boolean);
    const bgStyle = bgs && bgs.length > 1 ? { background: `linear-gradient(to right, ${bgs.join(", ")})` } : { backgroundColor: COLOUR_DICTIONARY[p.dominant]?.primary.hex ?? "#555" };
    return /* @__PURE__ */ React.createElement("div", { key: i, className: "flex-1", style: bgStyle });
  })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mt-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono text-[10px] text-foreground/20" }, "start"), /* @__PURE__ */ React.createElement("span", { className: "font-mono text-[10px] text-foreground/20" }, "end")))) : /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-24 gap-3" }, /* @__PURE__ */ React.createElement("p", { className: "font-serif italic text-foreground/25 text-lg" }, "Click Finish to generate your story stats.")))))), /* @__PURE__ */ React.createElement(
    "aside",
    {
      className: "w-[min(100%,24rem)] sm:w-[min(100%,26rem)] xl:w-[min(100%,28rem)] xl:max-w-[32vw] flex-shrink-0 border-l border-foreground/8 bg-background/15 flex flex-col gap-6 px-4 sm:px-6 py-6 sm:py-8 self-stretch overflow-y-auto",
      style: { scrollbarWidth: "thin", scrollbarColor: `rgba(${moodRgb},0.2) transparent` }
    },
    /* @__PURE__ */ React.createElement("div", { className: "space-y-5" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs uppercase tracking-wider text-foreground/30" }, "Resources"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleImageBar,
        disabled: generatingImg,
        className: `flex items-center gap-2 transition-all ${imageBar >= 100 && !generatingImg ? "cursor-pointer" : "cursor-default opacity-40"}`
      },
      generatingImg ? /* @__PURE__ */ React.createElement(Loader2, { className: "h-4 w-4 animate-spin", style: { color: moodAccent } }) : /* @__PURE__ */ React.createElement(ImageIcon, { className: "h-4 w-4", style: { color: imageBar >= 100 ? moodAccent : "currentColor" } }),
      /* @__PURE__ */ React.createElement(
        "span",
        {
          className: "font-mono text-xs uppercase tracking-wide",
          style: { color: imageBar >= 100 && !generatingImg ? moodAccent : void 0 }
        },
        generatingImg ? "Generating\u2026" : imageBar >= 100 ? "Generate Scene \u2726" : "Scene Vision"
      )
    ), /* @__PURE__ */ React.createElement("span", { className: "font-mono text-xs text-foreground/30" }, Math.round(imageBar), "%")), /* @__PURE__ */ React.createElement("div", { className: "h-[2px] rounded-full bg-foreground/10 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      motion.div,
      {
        className: "h-full rounded-full",
        style: { backgroundColor: moodAccent },
        animate: { width: `${imageBar}%` },
        transition: { duration: 0.5, ease: "easeOut" }
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handlePrompterBar,
        disabled: loadingNudge,
        className: `flex items-center gap-2 transition-all ${prompterBar >= 100 && !loadingNudge ? "cursor-pointer" : "cursor-default opacity-40"}`
      },
      loadingNudge ? /* @__PURE__ */ React.createElement(Loader2, { className: "h-4 w-4 animate-spin", style: { color: moodAccent } }) : /* @__PURE__ */ React.createElement(Sparkles, { className: "h-4 w-4", style: { color: prompterBar >= 100 ? moodAccent : "currentColor" } }),
      /* @__PURE__ */ React.createElement(
        "span",
        {
          className: "font-mono text-xs uppercase tracking-wide",
          style: { color: prompterBar >= 100 && !loadingNudge ? moodAccent : void 0 }
        },
        loadingNudge ? "Writing options\u2026" : prompterBar >= 100 ? "Get Continuations \u2726" : "AI Writer"
      )
    ), /* @__PURE__ */ React.createElement("span", { className: "font-mono text-sm text-foreground/50" }, Math.round(prompterBar), "%")), /* @__PURE__ */ React.createElement("div", { className: "h-[2px] rounded-full bg-foreground/10 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      motion.div,
      {
        className: "h-full rounded-full",
        style: { backgroundColor: moodAccent },
        animate: { width: `${prompterBar}%` },
        transition: { duration: 0.5, ease: "easeOut" }
      }
    ))), /* @__PURE__ */ React.createElement(AnimatePresence, null, continuations && /* @__PURE__ */ React.createElement(
      motion.div,
      {
        initial: { opacity: 0, height: 0, overflow: "hidden" },
        animate: { opacity: 1, height: "auto" },
        exit: { opacity: 0, height: 0 },
        transition: { duration: 0.3 },
        className: "space-y-3 pt-2"
      },
      /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm uppercase tracking-wider text-foreground/60 mb-2" }, "Available Continuations"),
      continuations.map((text, i) => /* @__PURE__ */ React.createElement(ContinuationCard, { key: i, text, accent: moodAccent, onPick: () => pickContinuation(text) })),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setContinuations(null),
          className: "font-mono text-[10px] text-foreground/25 hover:text-foreground/50 transition-colors mt-2 w-full text-left"
        },
        "dismiss"
      )
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "h-px bg-foreground/8" }),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 space-y-3" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm uppercase tracking-wider text-foreground/50" }, "Mood signals", activeSuggestions.length > 0 && ` \xB7 ${activeSuggestions.length}`), /* @__PURE__ */ React.createElement(AnimatePresence, null, activeSuggestions.map((s) => /* @__PURE__ */ React.createElement(
      SuggestionPill,
      {
        key: s.id,
        message: s.message,
        tier: s.tier,
        accent: moodAccent,
        onDismiss: () => dismissSuggestion(s.id)
      }
    )), activeSuggestions.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "font-serif italic text-[14px] text-foreground/20 leading-relaxed" }, "Signals appear as your emotional arc shifts\u2026"))),
    /* @__PURE__ */ React.createElement("div", { className: "h-px bg-foreground/8" }),
    /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm uppercase tracking-wider text-foreground/50" }, "Current Mood"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "w-3.5 h-3.5 rounded-full animate-pulse flex-shrink-0",
        style: { backgroundColor: moodAccent, transition: "background-color 8s ease" }
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "font-serif italic text-xl", style: { color: moodAccent, transition: "color 3s ease" } }, blend && blend.length > 0 ? blend.join(" \xB7 ") : dominant ?? "\u2014")),
    assistantState && assistantState.status === "transition" && /* @__PURE__ */ React.createElement(
      motion.div,
      {
        initial: { opacity: 0, y: 5 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        className: "mt-4 p-3.5 rounded border border-dashed border-foreground/15 bg-background/25 flex items-center gap-3"
      },
      /* @__PURE__ */ React.createElement(Loader2, { className: "h-4 w-4 animate-spin text-foreground/45 flex-shrink-0" }),
      /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[11px] text-foreground/60 leading-normal" }, assistantState.message)
    ))
  ), showPipelineInspector && /* @__PURE__ */ React.createElement("aside", { className: "w-[min(100%,24rem)] sm:w-[min(100%,26rem)] xl:w-[min(100%,28rem)] flex-shrink-0 z-[5] border-l border-foreground/8 flex flex-col self-stretch overflow-hidden" }, /* @__PURE__ */ React.createElement(PipelineInspector, { onClose: () => setShowInspector(false) }))), /* @__PURE__ */ React.createElement("footer", { className: "relative z-[2] border-t border-foreground/5 bg-background/5 flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between py-2 px-5" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/40" }, "ChromaWrite"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/40" }, "Auto-saves every 3s")))));
};
export default WritePad;
