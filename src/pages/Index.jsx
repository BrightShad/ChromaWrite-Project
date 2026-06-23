import React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PenLine, Clock, Download, MoreHorizontal, LogOut, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MeshGradientBackground from "@/components/MeshGradientBackground";
import HeroBubbles from "@/components/HeroBubbles";
import EmotionCircles from "@/components/EmotionCircles";
import { GrowthIcon, StoriesIcon, IntensityIcon, TimeIcon } from "@/components/AbstractIcons";
import { loadStories, deleteStory } from "@/lib/storyStore";
import { useAuth } from "@/lib/useAuth";
import { arcColorsForStory } from "@/lib/storyArcColors";
import { sceneImageSrcForDisplay } from "@/lib/sceneImageUrl";
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
async function exportStoryPDF(story, authorName) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 25, maxW = pageW - margin * 2;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, 297, "F");
    doc.setTextColor(20, 20, 20);
    doc.setFont("times", "italic");
    doc.setFontSize(26);
    doc.text(story.title, margin, 38);
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
    const sortedImages = (story.sceneGallery || []).filter((img) => img.insertedAt !== void 0).sort((a, b) => a.insertedAt - b.insertedAt);
    let lastIdx = 0;
    const textContent = story.content || story.snippet;
    const textSegments = [];
    const imageSegments = [];
    for (const img of sortedImages) {
      const idx = img.insertedAt;
      textSegments.push(textContent.slice(lastIdx, idx));
      imageSegments.push(img);
      lastIdx = idx;
    }
    textSegments.push(textContent.slice(lastIdx));
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
          const imgH = maxW * (680 / 512);
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
      doc.text(`${story.title} \xB7 ${i}/${pc}`, pageW / 2, 290, { align: "center" });
    }
    doc.save(`${story.title.replace(/\s+/g, "_")}.pdf`);
  } catch (e) {
    alert("PDF failed. Run: npm install jspdf");
  }
}
const StoryCard = ({ story, onHover, onLeave, onContinue, onDelete, onExport }) => {
  const [showMenu, setShowMenu] = useState(false);
  const arcStrip = arcColorsForStory(story);
  return /* @__PURE__ */ React.createElement("div", { className: "group cursor-pointer", onMouseEnter: onHover, onMouseLeave: () => {
    onLeave();
    setShowMenu(false);
  } }, /* @__PURE__ */ React.createElement("div", { className: `relative aspect-[2/3] rounded overflow-hidden card-grain bg-background ${!story.coverImage ? story.moodClass : ""}` }, story.coverImage ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: sceneImageSrcForDisplay(story.coverImage),
      alt: "Cover",
      className: "absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen",
      referrerPolicy: "no-referrer",
      loading: "lazy"
    }
  ) : /* @__PURE__ */ React.createElement(EmotionCircles, { moodColor: story.moodColor, chromaticArc: story.chromaticArc }), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent z-[2]" }), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onContinue,
      className: "flex items-center gap-2 border border-foreground/40 rounded px-5 py-2 text-foreground text-sm font-mono hover:bg-foreground/10 transition-colors"
    },
    /* @__PURE__ */ React.createElement(PenLine, { className: "h-3.5 w-3.5" }),
    "Continue"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onExport(),
      className: "flex items-center gap-2 border border-foreground/20 rounded px-4 py-1.5 text-foreground/60 text-xs font-mono hover:text-foreground/80 transition-colors"
    },
    /* @__PURE__ */ React.createElement(Download, { className: "h-3 w-3" }),
    "Export PDF"
  )), /* @__PURE__ */ React.createElement("div", { className: "absolute top-3 right-3 z-[4]" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowMenu((v) => !v),
      className: "p-1 text-foreground/30 hover:text-foreground/70 opacity-0 group-hover:opacity-100 transition-all"
    },
    /* @__PURE__ */ React.createElement(MoreHorizontal, { className: "h-4 w-4" })
  ), /* @__PURE__ */ React.createElement(AnimatePresence, null, showMenu && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0, y: -4 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0 },
      className: "absolute right-0 top-6 bg-card border border-border/40 rounded shadow-lg overflow-hidden w-28"
    },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onDelete,
        className: "w-full text-left px-3 py-2 font-mono text-xs text-destructive hover:bg-destructive/10 transition-colors"
      },
      "Delete"
    )
  ))), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-0 left-0 right-0 z-[3]" }, /* @__PURE__ */ React.createElement("div", { className: "px-4 pb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "font-serif text-2xl font-semibold italic text-foreground leading-tight drop-shadow-lg" }, story.title), /* @__PURE__ */ React.createElement("p", { className: "text-xs font-mono text-foreground/40 mt-2 line-clamp-2 leading-relaxed" }, story.snippet)), /* @__PURE__ */ React.createElement("div", { className: "h-[4px] w-full flex overflow-hidden rounded-sm" }, arcStrip.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex-1 min-w-[2px] first:rounded-l-sm last:rounded-r-sm", style: { background: c } }))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-0.5 mt-2 text-xs font-mono text-muted-foreground" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Clock, { className: "h-2.5 w-2.5" }), story.lastEdited), /* @__PURE__ */ React.createElement("span", null, (story.wordCount || 0).toLocaleString(), " w")));
};
const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, logout } = useAuth();
  const [activeMoodColor, setActiveMoodColor] = useState();
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const fetchStories = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      navigate("/");
      return;
    }
    setLoadingStories(true);
    const data = await loadStories(user?.id);
    setStories(data || []);
    setLoadingStories(false);
  }, [user, authLoading, navigate]);
  useEffect(() => {
    fetchStories();
  }, [fetchStories, location.key]);
  const handleDelete = async (id) => {
    await deleteStory(id);
    setStories((prev) => prev.filter((s) => s.id !== id));
  };
  const totalWords = stories.reduce((s, x) => s + (x.wordCount || 0), 0);
  const uniqueMoods = new Set(stories.map((s) => s.mood).filter(Boolean)).size;
  const lastStoryArcColors = useMemo(() => {
    const last = stories[0];
    if (!last) return ["hsl(174,50%,45%)", "hsl(270,40%,48%)", "hsl(350,55%,42%)", "hsl(35,80%,52%)"];
    return arcColorsForStory(last);
  }, [stories]);
  const avgSessionMins = stories.length > 0 ? Math.round(stories.reduce((acc, s) => acc + (s.elapsedMinutes || 0), 0) / stories.length) : 0;
  const stats = [
    { label: "total words", value: totalWords > 0 ? totalWords.toLocaleString() : "0", Icon: GrowthIcon, color: "text-chroma-teal" },
    { label: "stories", value: String(stories.length), Icon: StoriesIcon, color: "text-chroma-amber" },
    { label: "moods", value: String(uniqueMoods), Icon: IntensityIcon, color: "text-chroma-violet" },
    { label: "avg. session", value: `${avgSessionMins}m`, Icon: TimeIcon, color: "text-chroma-crimson" }
  ];
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen grain-overlay relative" }, /* @__PURE__ */ React.createElement(MeshGradientBackground, { activeColor: activeMoodColor }), /* @__PURE__ */ React.createElement("div", { className: "relative z-[1]" }, /* @__PURE__ */ React.createElement("header", { className: "sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-[95%] w-full mx-auto flex items-center justify-between py-3 px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("h1", { className: "font-brand text-2xl md:text-3xl text-gradient-chroma select-none italic", style: { fontWeight: 400, letterSpacing: "-0.01em" } }, "ChromaWrite")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => navigate("/new"),
      className: "flex items-center gap-2 rounded-[2px] border border-foreground/20 px-4 py-1.5 text-xs font-mono text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-all duration-300"
    },
    /* @__PURE__ */ React.createElement(PenLine, { className: "h-3.5 w-3.5" }),
    "New Story"
  ), /* @__PURE__ */ React.createElement("div", { className: "relative group" }, /* @__PURE__ */ React.createElement("button", { className: "flex items-center gap-2 px-3 py-1.5 rounded border border-foreground/15 hover:border-foreground/30 transition-all font-mono text-xs text-foreground/50 hover:text-foreground/80" }, /* @__PURE__ */ React.createElement("div", { className: "w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[9px] font-mono" }, user ? user.email?.slice(0, 1).toUpperCase() ?? "U" : "U"), user ? user.email?.split("@")[0] ?? "User" : "User 1"), /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 top-full pt-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 w-36" }, /* @__PURE__ */ React.createElement("div", { className: "bg-card border border-border/40 rounded shadow-lg overflow-hidden" }, user && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: logout,
      className: "w-full flex items-center gap-2 px-3 py-2.5 font-mono text-[11px] text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
    },
    /* @__PURE__ */ React.createElement(LogOut, { className: "h-3.5 w-3.5" }),
    "Log out"
  ), !user && /* @__PURE__ */ React.createElement("button", { onClick: () => navigate("/"), className: "w-full text-left px-3 py-2.5 font-mono text-[11px] text-foreground/30 hover:text-foreground/80" }, "Log In"))))))), /* @__PURE__ */ React.createElement("main", { className: "max-w-[95%] w-full mx-auto px-6 py-8 space-y-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-baseline gap-2" }, /* @__PURE__ */ React.createElement("p", { className: "font-serif italic text-foreground/50 text-xl md:text-2xl leading-snug" }, "Welcome back,", " ", /* @__PURE__ */ React.createElement("span", { className: "text-foreground/80" }, user?.email?.split("@")[0] ?? "writer"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-5" }, /* @__PURE__ */ React.createElement("section", { className: "grid grid-cols-2 gap-3" }, stats.map((stat) => /* @__PURE__ */ React.createElement("div", { key: stat.label, className: "border border-border/40 rounded p-4 text-center pb-5" }, /* @__PURE__ */ React.createElement(stat.Icon, { className: `h-6 w-6 mx-auto mb-3 ${stat.color} opacity-50` }), /* @__PURE__ */ React.createElement("p", { className: "font-serif text-4xl font-light text-foreground" }, stat.value), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-muted-foreground mt-2 uppercase tracking-wider" }, stat.label)))), /* @__PURE__ */ React.createElement("section", { className: "relative rounded overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 opacity-20 bg-gradient-to-r from-chroma-teal/20 via-chroma-violet/20 to-chroma-amber/20 blur-3xl" }), /* @__PURE__ */ React.createElement("div", { className: "relative border border-border/40 rounded p-5" }, /* @__PURE__ */ React.createElement("h3", { className: "font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4" }, "Last Story Arc"), /* @__PURE__ */ React.createElement("div", { className: "h-9 rounded-sm overflow-hidden flex min-w-0" }, lastStoryArcColors.map((c, i) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: i,
      className: "flex-1 min-w-[2px] first:rounded-l-sm last:rounded-r-sm",
      style: { background: c },
      title: `Segment ${i + 1}`
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mt-3 font-mono text-[10px] sm:text-xs text-muted-foreground/60" }, /* @__PURE__ */ React.createElement("span", null, "start"), /* @__PURE__ */ React.createElement("span", null, lastStoryArcColors.length > 4 ? `${lastStoryArcColors.length} beats` : "arc"), /* @__PURE__ */ React.createElement("span", null, "end"))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("section", { className: "relative rounded overflow-hidden hero-gradient h-full min-h-[360px]" }, /* @__PURE__ */ React.createElement(HeroBubbles, null), /* @__PURE__ */ React.createElement("div", { className: "card-grain" }), /* @__PURE__ */ React.createElement("div", { className: "relative z-[2] px-8 py-12 flex flex-col items-center justify-center text-center h-full" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs uppercase tracking-[0.3em] text-foreground/40 mb-3 mt-4" }, "New Session"), /* @__PURE__ */ React.createElement("h2", { className: "font-serif text-3xl md:text-5xl lg:text-6xl font-light italic text-foreground leading-tight mb-4" }, "Begin a Chromatic Narrative"), /* @__PURE__ */ React.createElement("p", { className: "font-serif text-base italic text-foreground/50 max-w-md leading-relaxed mb-1" }, "Let your words paint the world."), /* @__PURE__ */ React.createElement("p", { className: "font-serif text-base italic text-foreground/50 max-w-md leading-relaxed mb-8" }, "Watch colours shift with every emotion."), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => navigate("/new"),
      className: "group flex items-center gap-3 border border-foreground/20 rounded-[2px] px-8 py-3 font-mono text-sm tracking-[0.15em] uppercase text-foreground/80 hover:bg-foreground/5 hover:border-foreground/40 transition-all duration-300"
    },
    /* @__PURE__ */ React.createElement("span", { className: "h-2 w-2 rounded-full bg-chroma-amber" }),
    "Start Writing"
  ))))), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 px-1" }, /* @__PURE__ */ React.createElement("h3", { className: "font-mono text-xs uppercase tracking-[0.2em] text-foreground/80 font-semibold" }, "Your Stories"), /* @__PURE__ */ React.createElement("span", { className: "font-mono text-xs text-foreground/60" }, stories.length, " ", stories.length === 1 ? "story" : "stories")), loadingStories ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center py-16" }, /* @__PURE__ */ React.createElement(Loader2, { className: "h-5 w-5 animate-spin text-muted-foreground" })) : stories.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "border border-border/30 rounded p-12 text-center" }, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-lg italic text-foreground/30" }, "No stories yet."), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/20 mt-2" }, "Start writing to see your stories here.")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" }, (showAll ? stories : stories.slice(0, 8)).map((story) => /* @__PURE__ */ React.createElement(
    StoryCard,
    {
      key: story.id,
      story,
      onHover: () => setActiveMoodColor(story.moodColor),
      onLeave: () => setActiveMoodColor(void 0),
      onDelete: () => handleDelete(story.id),
      onExport: () => exportStoryPDF(story, user?.email?.split("@")[0] ?? "writer"),
      onContinue: () => navigate("/write", {
        state: {
          mood: story.mood,
          moodHsl: story.moodColor.replace("hsl(", "").replace(")", ""),
          title: story.title,
          storyId: story.id,
          existingContent: story.content,
          existingElapsed: story.elapsedMinutes ?? 0,
          existingArcPoints: story.savedArcPoints ?? [],
          existingSceneGallery: story.sceneGallery ?? []
        }
      })
    }
  ))), stories.length > 8 && /* @__PURE__ */ React.createElement("div", { className: "flex justify-center mt-6" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowAll((v) => !v),
      className: "px-6 py-2 rounded border border-foreground/15 text-xs font-mono text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
    },
    showAll ? "Collapse" : "See All"
  )))))));
};
export default Index;
