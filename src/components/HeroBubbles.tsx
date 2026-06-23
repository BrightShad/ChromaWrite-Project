import { motion } from "framer-motion";

const bubbles = [
  { cx: "20%", cy: "30%", r: 80, color: "hsl(var(--chroma-amber) / 0.15)", delay: 0, dur: 8 },
  { cx: "70%", cy: "25%", r: 120, color: "hsl(var(--chroma-crimson) / 0.12)", delay: 1, dur: 10 },
  { cx: "50%", cy: "60%", r: 60, color: "hsl(var(--chroma-violet) / 0.14)", delay: 0.5, dur: 9 },
  { cx: "80%", cy: "70%", r: 90, color: "hsl(var(--chroma-teal) / 0.1)", delay: 2, dur: 11 },
  { cx: "30%", cy: "75%", r: 50, color: "hsl(var(--chroma-amber) / 0.1)", delay: 1.5, dur: 7 },
  { cx: "15%", cy: "55%", r: 100, color: "hsl(var(--chroma-crimson) / 0.08)", delay: 0.8, dur: 12 },
  { cx: "60%", cy: "40%", r: 70, color: "hsl(var(--chroma-violet) / 0.1)", delay: 2.5, dur: 9 },
];

const HeroBubbles = () => (
  <div className="absolute inset-0 overflow-hidden z-[1]">
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      <defs>
        <filter id="bubbleBlur">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
    </svg>
    {bubbles.map((b, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          left: b.cx,
          top: b.cy,
          width: b.r * 2,
          height: b.r * 2,
          background: `radial-gradient(circle at 35% 35%, ${b.color}, transparent 70%)`,
          filter: "blur(4px)",
          transform: "translate(-50%, -50%)",
        }}
        animate={{
          y: [0, -15, 5, -10, 0],
          x: [0, 8, -5, 3, 0],
          scale: [1, 1.08, 0.95, 1.04, 1],
        }}
        transition={{
          duration: b.dur,
          repeat: Infinity,
          ease: "easeInOut",
          delay: b.delay,
        }}
      />
    ))}
  </div>
);

export default HeroBubbles;
