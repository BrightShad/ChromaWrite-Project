import { motion } from "framer-motion";

const blobs = [
  {
    color: "hsl(var(--chroma-teal) / 0.25)",
    initial: { x: "10%", y: "15%", scale: 1 },
    animate: {
      x: ["10%", "60%", "30%", "10%"],
      y: ["15%", "50%", "70%", "15%"],
      scale: [1, 1.3, 0.9, 1],
    },
    duration: 20,
  },
  {
    color: "hsl(var(--chroma-amber) / 0.2)",
    initial: { x: "70%", y: "20%", scale: 1.1 },
    animate: {
      x: ["70%", "20%", "50%", "70%"],
      y: ["20%", "60%", "10%", "20%"],
      scale: [1.1, 0.8, 1.2, 1.1],
    },
    duration: 25,
  },
  {
    color: "hsl(var(--chroma-crimson) / 0.18)",
    initial: { x: "40%", y: "70%", scale: 0.9 },
    animate: {
      x: ["40%", "80%", "15%", "40%"],
      y: ["70%", "25%", "45%", "70%"],
      scale: [0.9, 1.15, 1, 0.9],
    },
    duration: 22,
  },
  {
    color: "hsl(var(--chroma-violet) / 0.2)",
    initial: { x: "85%", y: "60%", scale: 1 },
    animate: {
      x: ["85%", "30%", "65%", "85%"],
      y: ["60%", "15%", "80%", "60%"],
      scale: [1, 1.2, 0.85, 1],
    },
    duration: 18,
  },
];

interface MeshGradientBackgroundProps {
  activeColor?: string;
}

const MeshGradientBackground = ({ activeColor }: MeshGradientBackgroundProps) => (
  <div className="fixed inset-0 z-0 overflow-hidden">
    {/* Base dark layer */}
    <div className="absolute inset-0 bg-background" />

    {/* Active mood color wash */}
    <motion.div
      className="absolute inset-0"
      animate={{
        backgroundColor: activeColor || "transparent",
      }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      style={{ opacity: 0.08 }}
    />

    {/* Floating gradient blobs */}
    {blobs.map((blob, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: "45vmax",
          height: "45vmax",
          background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
          filter: "blur(80px)",
          left: blob.initial.x,
          top: blob.initial.y,
        }}
        animate={blob.animate}
        transition={{
          duration: blob.duration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

export default MeshGradientBackground;
