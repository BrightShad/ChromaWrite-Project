import React from "react";
const EmotionCircles = ({ moodColor, chromaticArc }) => {
  const safeArc = Array.isArray(chromaticArc) ? chromaticArc : [];
  const baseColor = moodColor || "hsl(45 85% 55%)";
  const colors = [
    baseColor,
    ...(safeArc.length > 0 ? safeArc : [baseColor, baseColor, baseColor]).slice(0, 3)
  ];
  while (colors.length < 4) {
    colors.push(colors[colors.length - 1] || baseColor);
  }
  return /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-background" }), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "absolute rounded-full",
      style: {
        width: "65%",
        height: "65%",
        left: "25%",
        top: "20%",
        background: `radial-gradient(circle at 40% 40%, ${colors[0]} 0%, transparent 70%)`,
        opacity: 0.7
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "absolute rounded-full",
      style: {
        width: "50%",
        height: "50%",
        left: "45%",
        top: "40%",
        background: `radial-gradient(circle at 40% 40%, ${colors[1]} 0%, transparent 70%)`,
        opacity: 0.6
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "absolute rounded-full",
      style: {
        width: "35%",
        height: "35%",
        left: "15%",
        top: "55%",
        background: `radial-gradient(circle at 40% 40%, ${colors[2]} 0%, transparent 70%)`,
        opacity: 0.5
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "absolute rounded-full",
      style: {
        width: "20%",
        height: "20%",
        left: "60%",
        top: "15%",
        background: `radial-gradient(circle at 40% 40%, ${colors[3] || colors[0]} 0%, transparent 70%)`,
        opacity: 0.4
      }
    }
  ));
};
export default EmotionCircles;
