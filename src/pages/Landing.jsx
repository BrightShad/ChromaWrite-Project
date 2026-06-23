import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Loader2 } from "lucide-react";
import MeshGradientBackground from "@/components/MeshGradientBackground";
import { useAuth } from "@/lib/useAuth";
const Landing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, login, error } = useAuth();
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("chroma");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoggingIn(true);
    await new Promise((r) => setTimeout(r, 600));
    const success = await login(username, password);
    setIsLoggingIn(false);
    if (success) {
      navigate("/dashboard");
    }
  };
  if (authLoading) return null;
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen grain-overlay relative flex items-center justify-center overflow-hidden" }, /* @__PURE__ */ React.createElement(MeshGradientBackground, { activeColor: "hsl(260 40% 48%)" }), /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-background/40 to-background/90 z-0 pointer-events-none" }), /* @__PURE__ */ React.createElement("div", { className: "relative z-10 w-full max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center" }, /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.8, ease: "easeOut" },
      className: "space-y-6 text-center md:text-left pt-12 md:pt-0"
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center md:justify-start gap-4 mb-8" }, /* @__PURE__ */ React.createElement("span", { className: "font-brand text-2xl text-gradient-chroma select-none italic", style: { fontWeight: 400, letterSpacing: "-0.01em" } }, "ChromaWrite")),
    /* @__PURE__ */ React.createElement("h1", { className: "font-serif text-5xl md:text-7xl font-light italic text-foreground leading-[1.1] drop-shadow-lg" }, "Hey there."),
    /* @__PURE__ */ React.createElement("p", { className: "font-serif text-xl md:text-3xl text-foreground/80 leading-relaxed max-w-lg mx-auto md:mx-0" }, "Get into the chromatic journey."),
    /* @__PURE__ */ React.createElement("p", { className: "font-mono text-sm text-foreground/50 max-w-md mx-auto md:mx-0 leading-relaxed" }, "A sentient canvas that bleeds color with your every word, reshaping its ambient atmosphere entirely based on the raw emotional gravity of your story.")
  ), /* @__PURE__ */ React.createElement(
    motion.div,
    {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.8, delay: 0.2, ease: "easeOut" },
      className: "w-full max-w-sm mx-auto p-8 rounded-xl border border-foreground/10 bg-background/50 backdrop-blur-2xl shadow-2xl relative overflow-hidden group"
    },
    /* @__PURE__ */ React.createElement("div", { className: "absolute -inset-2 bg-gradient-to-r from-chroma-teal/10 via-chroma-violet/10 to-chroma-amber/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0" }),
    /* @__PURE__ */ React.createElement("div", { className: "relative z-10" }, /* @__PURE__ */ React.createElement("h2", { className: "font-serif text-2xl italic text-foreground mb-1" }, "Enter the Canvas"), /* @__PURE__ */ React.createElement("p", { className: "font-mono text-xs text-foreground/40 mb-8" }, "Log in to sync your stories."), /* @__PURE__ */ React.createElement("form", { onSubmit: handleLogin, className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "font-mono text-[10px] uppercase tracking-widest text-foreground/50 pl-1" }, "Username"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: username,
        onChange: (e) => setUsername(e.target.value),
        className: "w-full bg-foreground/5 border border-foreground/10 focus:border-foreground/40 rounded px-4 py-3 outline-none font-mono text-sm text-foreground transition-all duration-300",
        autoComplete: "username",
        required: true
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "font-mono text-[10px] uppercase tracking-widest text-foreground/50 pl-1" }, "Password"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        value: password,
        onChange: (e) => setPassword(e.target.value),
        className: "w-full bg-foreground/5 border border-foreground/10 focus:border-foreground/40 rounded px-4 py-3 outline-none font-mono text-sm text-foreground transition-all duration-300",
        autoComplete: "current-password",
        required: true
      }
    )), error && /* @__PURE__ */ React.createElement(
      motion.p,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        className: "font-mono text-xs text-chroma-crimson"
      },
      error
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: isLoggingIn,
        className: "w-full flex items-center justify-center gap-3 border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 hover:border-foreground/40 rounded py-3 font-mono text-xs text-foreground transition-all disabled:opacity-40 mt-4 overflow-hidden relative"
      },
      /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:animate-[shimmer_2s_infinite]" }),
      isLoggingIn ? /* @__PURE__ */ React.createElement(Loader2, { className: "h-4 w-4 animate-spin text-foreground/70" }) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(LogIn, { className: "h-4 w-4 text-foreground/70" }), /* @__PURE__ */ React.createElement("span", null, "Authenticate"))
    )))
  )));
};
export default Landing;
