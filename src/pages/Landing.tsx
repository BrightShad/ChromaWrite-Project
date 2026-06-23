import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, Loader2 } from "lucide-react";
import MeshGradientBackground from "@/components/MeshGradientBackground";
import { useAuth } from "@/lib/useAuth";
import { ChromaLogo } from "./Index";

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, login, error } = useAuth();
  
  const [username, setUsername] = useState("user");
  const [password, setPassword] = useState("chroma");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoggingIn(true);
    
    // Simulate slight network delay for effect
    await new Promise(r => setTimeout(r, 600));
    
    const success = await login(username, password);
    setIsLoggingIn(false);
    
    if (success) {
      navigate("/dashboard");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen grain-overlay relative flex items-center justify-center overflow-hidden">
      {/* Background visual */}
      <MeshGradientBackground activeColor="hsl(260 40% 48%)" />
      
      {/* Heavy vignette to center the content */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-background/40 to-background/90 z-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        
        {/* Left: Typography & Hero */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 text-center md:text-left pt-12 md:pt-0"
        >
          <div className="flex items-center justify-center md:justify-start gap-4 mb-8">
            <ChromaLogo />
            <span className="font-brand text-2xl text-gradient-chroma select-none italic" style={{fontWeight: 400, letterSpacing: "-0.01em"}}>
              ChromaWrite
            </span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-light italic text-foreground leading-[1.1] drop-shadow-lg">
            Hey there.
          </h1>
          <p className="font-serif text-xl md:text-3xl text-foreground/80 leading-relaxed max-w-lg mx-auto md:mx-0">
            Get into the chromatic journey.
          </p>
          <p className="font-mono text-sm text-foreground/50 max-w-md mx-auto md:mx-0 leading-relaxed">
            A sentient canvas that bleeds color with your every word, reshaping its ambient atmosphere entirely based on the raw emotional gravity of your story.
          </p>
        </motion.div>

        {/* Right: Auth Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-sm mx-auto p-8 rounded-xl border border-foreground/10 bg-background/50 backdrop-blur-2xl shadow-2xl relative overflow-hidden group"
        >
          {/* Subtle glow behind card */}
          <div className="absolute -inset-2 bg-gradient-to-r from-chroma-teal/10 via-chroma-violet/10 to-chroma-amber/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0" />
          
          <div className="relative z-10">
            <h2 className="font-serif text-2xl italic text-foreground mb-1">Enter the Canvas</h2>
            <p className="font-mono text-xs text-foreground/40 mb-8">Log in to sync your stories.</p>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-foreground/50 pl-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-foreground/5 border border-foreground/10 focus:border-foreground/40 rounded px-4 py-3 outline-none font-mono text-sm text-foreground transition-all duration-300"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase tracking-widest text-foreground/50 pl-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-foreground/5 border border-foreground/10 focus:border-foreground/40 rounded px-4 py-3 outline-none font-mono text-sm text-foreground transition-all duration-300"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="font-mono text-xs text-chroma-crimson"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-3 border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 hover:border-foreground/40 rounded py-3 font-mono text-xs text-foreground transition-all disabled:opacity-40 mt-4 overflow-hidden relative"
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:animate-[shimmer_2s_infinite]" />
                
                {isLoggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin text-foreground/70" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4 text-foreground/70" />
                    <span>Authenticate</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Landing;
