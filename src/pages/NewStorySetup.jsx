import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Shuffle, PenLine, Minus } from "lucide-react";
import { toast } from "sonner";
import EmotionCircles from "@/components/EmotionCircles";
const moods = [
  {
    name: "Anger",
    gradient: "linear-gradient(135deg, hsl(5 50% 18%), hsl(0 60% 20%))",
    hsl: "5 70% 45%",
    moodColor: "hsl(5 70% 45%)",
    chromaticArc: ["hsl(5,70%,45%)", "hsl(0,65%,40%)", "hsl(10,60%,42%)", "hsl(5,70%,48%)"],
    description: "Intense, searing \u2014 a burn that drives the pen"
  },
  {
    name: "Disgust",
    gradient: "linear-gradient(135deg, hsl(90 20% 16%), hsl(100 25% 18%))",
    hsl: "90 30% 45%",
    moodColor: "hsl(90 30% 45%)",
    chromaticArc: ["hsl(90,30%,45%)", "hsl(85,25%,40%)", "hsl(100,35%,42%)", "hsl(90,30%,48%)"],
    description: "Visceral, repulsed \u2014 turning away from the foul"
  },
  {
    name: "Fear",
    gradient: "linear-gradient(135deg, hsl(270 20% 16%), hsl(280 25% 18%))",
    hsl: "270 30% 35%",
    moodColor: "hsl(270 30% 35%)",
    chromaticArc: ["hsl(270,30%,35%)", "hsl(260,25%,30%)", "hsl(280,35%,38%)", "hsl(270,30%,40%)"],
    description: "Shadowed, tense \u2014 a chilling grip of the unknown"
  },
  {
    name: "Happiness",
    gradient: "linear-gradient(135deg, hsl(45 50% 18%), hsl(35 60% 20%))",
    hsl: "45 85% 55%",
    moodColor: "hsl(45 85% 55%)",
    chromaticArc: ["hsl(45,85%,55%)", "hsl(35,80%,50%)", "hsl(50,80%,58%)", "hsl(40,85%,52%)"],
    description: "Radiant, uplifting \u2014 breathing in the light"
  },
  {
    name: "Surprise",
    gradient: "linear-gradient(135deg, hsl(174 40% 16%), hsl(190 35% 20%))",
    hsl: "174 65% 45%",
    moodColor: "hsl(174 65% 45%)",
    chromaticArc: ["hsl(174,65%,45%)", "hsl(165,60%,40%)", "hsl(180,60%,48%)", "hsl(174,65%,50%)"],
    description: "Sudden, striking \u2014 jolted out of the expected"
  },
  {
    name: "Sadness",
    gradient: "linear-gradient(135deg, hsl(220 20% 16%), hsl(210 25% 18%))",
    hsl: "220 40% 35%",
    moodColor: "hsl(220 40% 35%)",
    chromaticArc: ["hsl(220,40%,35%)", "hsl(210,35%,30%)", "hsl(225,40%,38%)", "hsl(215,35%,40%)"],
    description: "Heavy, hollow \u2014 carrying a profound weight"
  }
];
const neutralMood = {
  name: "Neutral",
  gradient: "linear-gradient(135deg, hsl(220 10% 14%), hsl(220 8% 18%))",
  hsl: "220 10% 40%",
  moodColor: "hsl(220 10% 40%)",
  chromaticArc: ["hsl(220,10%,40%)", "hsl(220,8%,35%)", "hsl(220,6%,38%)", "hsl(220,10%,42%)"],
  description: "No emotional bias \u2014 let the story find its own colour"
};
const NewStorySetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("mood");
  const [selectedMood, setSelectedMood] = useState(null);
  const [customEmotion, setCustomEmotion] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [hoveredMood, setHoveredMood] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const pickRandom = () => {
    const random = moods[Math.floor(Math.random() * moods.length)];
    setSelectedMood(random);
    setShowCustomInput(false);
    setCustomEmotion("");
  };
  const handleBeginWriting = () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your narrative.");
      return;
    }
    if (!selectedMood && !showCustomInput) {
      toast.error("Please select an opening mood.");
      return;
    }
    if (showCustomInput && !customEmotion.trim()) {
      toast.error("Please type a custom emotion.");
      return;
    }
    const moodName = showCustomInput && customEmotion ? customEmotion : selectedMood?.name || "Neutral";
    const moodHsl = selectedMood?.hsl || neutralMood.hsl;
    navigate("/write", {
      state: {
        mood: moodName,
        moodHsl,
        title: title || "Untitled",
        description
      }
    });
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-background grain-overlay relative overflow-hidden" }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      className: "fixed inset-0 z-0",
      animate: {
        background: selectedMood ? selectedMood.gradient : "linear-gradient(135deg, hsl(30 6% 5%), hsl(30 4% 8%))"
      },
      transition: { duration: 1.5, ease: "easeInOut" }
    }
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "fixed inset-0 z-[1] opacity-[0.04] pointer-events-none",
      style: {
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px"
      }
    }
  ), /* @__PURE__ */ React.createElement("div", { className: "relative z-[2] min-h-screen flex flex-col" }, /* @__PURE__ */ React.createElement("header", { className: "border-b border-border/30 bg-background/20 backdrop-blur-xl" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-[95%] w-full mx-auto flex items-center justify-between py-3 px-6" }, /* @__PURE__ */ React.createElement("button", { onClick: () => navigate("/"), className: "flex items-center gap-2.5" }, /* @__PURE__ */ React.createElement("span", { className: "font-brand text-xl text-gradient-chroma italic", style: { fontWeight: 400, letterSpacing: "-0.01em" } }, "ChromaWrite")), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm uppercase tracking-[0.3em] text-foreground/60" }, "New Session"))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 flex items-center justify-center px-4 py-8 md:py-12 relative overflow-hidden" }, /* @__PURE__ */ React.createElement(AnimatePresence, null, hoveredMood && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0 },
      animate: { opacity: 0.15 },
      exit: { opacity: 0 },
      transition: { duration: 0.5, ease: "easeOut" },
      className: "absolute inset-0 pointer-events-none mix-blend-screen",
      style: {
        background: `radial-gradient(circle at center, ${hoveredMood.moodColor} 0%, transparent 70%)`
      }
    }
  )), /* @__PURE__ */ React.createElement(AnimatePresence, { mode: "wait" }, step === "mood" && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: "mood",
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.4 },
      className: "w-full max-w-3xl scale-[0.85] origin-top"
    },
    /* @__PURE__ */ React.createElement("div", { className: "text-center mb-8" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs md:text-sm uppercase tracking-[0.3em] text-foreground/60 mb-3" }, "Step 1 \u2014 Emotion Seed"), /* @__PURE__ */ React.createElement("h2", { className: "font-serif text-3xl md:text-4xl font-light italic text-foreground mb-3" }, "Choose Your Opening Mood"), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs md:text-sm text-foreground/40 max-w-lg mx-auto leading-relaxed" }, "Set the initial colour world \u2014 the palette will evolve as your words shift the emotional landscape.")),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4 mb-6" }, moods.map((mood) => /* @__PURE__ */ React.createElement(
      motion.button,
      {
        key: mood.name,
        onClick: () => {
          setSelectedMood(mood);
          setShowCustomInput(false);
          setCustomEmotion("");
        },
        onMouseEnter: () => setHoveredMood(mood),
        onMouseLeave: () => setHoveredMood(null),
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
        className: "text-left group"
      },
      /* @__PURE__ */ React.createElement("div", { className: `relative aspect-square sm:aspect-square rounded overflow-hidden transition-all duration-300 ${selectedMood?.name === mood.name ? "ring-2 ring-foreground/50 shadow-lg" : "ring-1 ring-foreground/10 hover:ring-foreground/25"}` }, /* @__PURE__ */ React.createElement(EmotionCircles, { moodColor: mood.moodColor, chromaticArc: mood.chromaticArc }), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent z-[2]" }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-0 left-0 right-0 z-[3] p-4 text-left" }, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-lg italic text-foreground mb-1" }, mood.name), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-[10px] sm:text-xs text-foreground/40 leading-snug line-clamp-2" }, mood.description)), selectedMood?.name === mood.name && /* @__PURE__ */ React.createElement(
        motion.div,
        {
          layoutId: "mood-sel",
          className: "absolute bottom-0 left-0 right-0 h-[3px] z-[4]",
          style: { background: `linear-gradient(to right, ${mood.chromaticArc.join(", ")})` }
        }
      ))
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "flex gap-4 mb-6" }, /* @__PURE__ */ React.createElement(
      motion.button,
      {
        onClick: () => {
          setSelectedMood(neutralMood);
          setShowCustomInput(false);
          setCustomEmotion("");
        },
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        className: `flex-1 rounded border p-4 text-left transition-all duration-300 ${selectedMood?.name === "Neutral" ? "border-foreground/40 bg-foreground/5" : "border-foreground/10 hover:border-foreground/25"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(Minus, { className: "h-5 w-5 text-foreground/30" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-sm italic text-foreground leading-tight" }, "Neutral"), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/40 leading-tight hidden sm:block mt-1" }, neutralMood.description)))
    ), /* @__PURE__ */ React.createElement(
      motion.button,
      {
        onClick: () => {
          setShowCustomInput(true);
          setSelectedMood(null);
        },
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        className: `flex-1 rounded border p-4 text-left transition-all duration-300 ${showCustomInput ? "border-foreground/40 bg-foreground/5" : "border-foreground/10 hover:border-foreground/25"}`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(PenLine, { className: "h-5 w-5 text-foreground/30" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-sm italic text-foreground leading-tight" }, "Custom Emotion"), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/40 leading-tight hidden sm:block mt-1" }, "Type any feeling manually")))
    )),
    /* @__PURE__ */ React.createElement(AnimatePresence, null, showCustomInput && /* @__PURE__ */ React.createElement(
      motion.div,
      {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: "auto" },
        exit: { opacity: 0, height: 0 },
        className: "mb-8 overflow-hidden"
      },
      /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: customEmotion,
          onChange: (e) => setCustomEmotion(e.target.value),
          placeholder: "e.g. Nostalgia, Dread, Euphoria...",
          className: "w-full bg-transparent border-b border-foreground/15 focus:border-foreground/40 outline-none py-3 font-serif text-xl italic text-foreground placeholder:text-foreground/20 transition-colors",
          autoFocus: true
        }
      )
    )),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: pickRandom,
        className: "flex items-center gap-2 rounded-[2px] border border-foreground/15 px-5 py-2.5 font-mono text-xs text-foreground/50 hover:text-foreground/70 hover:border-foreground/30 transition-all duration-300"
      },
      /* @__PURE__ */ React.createElement(Shuffle, { className: "h-3.5 w-3.5" }),
      "Random"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (!selectedMood && !showCustomInput) setSelectedMood(neutralMood);
          setStep("details");
        },
        className: "flex items-center gap-2 rounded-[2px] border border-foreground/20 px-6 py-2.5 font-mono text-xs text-foreground/80 hover:bg-foreground/5 hover:border-foreground/40 hover:shadow-[0_0_20px_hsl(174_50%_45%/0.12)] transition-all duration-300"
      },
      "Continue",
      /* @__PURE__ */ React.createElement(ArrowRight, { className: "h-3.5 w-3.5" })
    ))
  ), step === "details" && /* @__PURE__ */ React.createElement(
    motion.div,
    {
      key: "details",
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      className: "w-full max-w-3xl scale-[0.85] origin-top"
    },
    /* @__PURE__ */ React.createElement("div", { className: "text-center mb-10" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm uppercase tracking-[0.3em] text-foreground/80 mb-3" }, "Step 2 \u2014 Story Details"), /* @__PURE__ */ React.createElement("h2", { className: "font-serif text-3xl md:text-4xl font-light italic text-foreground mb-3" }, "Name Your Narrative"), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm text-foreground/70 max-w-md mx-auto leading-relaxed" }, "Give your story shape \u2014 you can always change these later.")),
    /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("label", { className: "font-mono text-xs uppercase tracking-[0.2em] text-foreground/70 mb-2 block" }, "Title"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: title,
        onChange: (e) => setTitle(e.target.value),
        placeholder: "Untitled",
        className: "w-full bg-transparent border-b border-foreground/30 focus:border-foreground/60 outline-none py-3 font-serif text-2xl italic text-foreground placeholder:text-foreground/40 transition-colors"
      }
    )),
    /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("label", { className: "font-mono text-xs uppercase tracking-[0.2em] text-foreground/70 mb-2 block" }, "Description ", /* @__PURE__ */ React.createElement("span", { className: "text-foreground/40" }, "(optional)")), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: description,
        onChange: (e) => setDescription(e.target.value),
        placeholder: "A brief premise or guiding thought for your story...",
        rows: 3,
        className: "w-full bg-transparent border border-foreground/30 rounded focus:border-foreground/60 outline-none p-3 font-mono text-sm text-foreground placeholder:text-foreground/40 transition-colors resize-none"
      }
    )),
    /* @__PURE__ */ React.createElement("div", { className: "border border-foreground/30 rounded p-4 mb-8" }, /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs uppercase tracking-[0.2em] text-foreground/70 mb-3" }, "Session Preview"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "w-12 h-12 rounded overflow-hidden relative",
        style: { background: selectedMood?.gradient || neutralMood.gradient }
      },
      selectedMood && /* @__PURE__ */ React.createElement(EmotionCircles, { moodColor: selectedMood.moodColor, chromaticArc: selectedMood.chromaticArc })
    ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-serif text-lg italic text-foreground" }, title || "Untitled"), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/70" }, showCustomInput && customEmotion ? customEmotion : selectedMood?.name || "Neutral")))),
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setStep("mood"),
        className: "flex items-center gap-2 rounded-[2px] border border-foreground/15 px-5 py-2.5 font-mono text-xs text-foreground/50 hover:text-foreground/70 hover:border-foreground/30 transition-all duration-300"
      },
      /* @__PURE__ */ React.createElement(ArrowLeft, { className: "h-3.5 w-3.5" }),
      "Back"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleBeginWriting,
        className: "group flex items-center gap-3 rounded-[2px] border border-foreground/20 px-8 py-3 font-mono text-sm text-foreground/80 hover:bg-foreground/5 hover:border-foreground/40 hover:shadow-[0_0_25px_hsl(174_50%_45%/0.15)] transition-all duration-300"
      },
      /* @__PURE__ */ React.createElement(PenLine, { className: "h-4 w-4 text-foreground/50 group-hover:text-primary transition-colors" }),
      "Begin Writing"
    ))
  )))));
};
export default NewStorySetup;
