interface EmotionCirclesProps {
  moodColor: string;
  chromaticArc: string[];
}

const EmotionCircles = ({ moodColor, chromaticArc }: EmotionCirclesProps) => {
  const colors = [moodColor, ...chromaticArc.slice(0, 3)];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base dark fill */}
      <div className="absolute inset-0 bg-background" />
      {/* Main circle */}
      <div
        className="absolute rounded-full"
        style={{
          width: "65%",
          height: "65%",
          left: "25%",
          top: "20%",
          background: `radial-gradient(circle at 40% 40%, ${colors[0]} 0%, transparent 70%)`,
          opacity: 0.7,
        }}
      />
      {/* Secondary circle */}
      <div
        className="absolute rounded-full"
        style={{
          width: "50%",
          height: "50%",
          left: "45%",
          top: "40%",
          background: `radial-gradient(circle at 40% 40%, ${colors[1]} 0%, transparent 70%)`,
          opacity: 0.6,
        }}
      />
      {/* Small accent circle */}
      <div
        className="absolute rounded-full"
        style={{
          width: "35%",
          height: "35%",
          left: "15%",
          top: "55%",
          background: `radial-gradient(circle at 40% 40%, ${colors[2]} 0%, transparent 70%)`,
          opacity: 0.5,
        }}
      />
      {/* Tiny circle */}
      <div
        className="absolute rounded-full"
        style={{
          width: "20%",
          height: "20%",
          left: "60%",
          top: "15%",
          background: `radial-gradient(circle at 40% 40%, ${colors[3] || colors[0]} 0%, transparent 70%)`,
          opacity: 0.4,
        }}
      />
    </div>
  );
};

export default EmotionCircles;
