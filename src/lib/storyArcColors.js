import { COLOUR_DICTIONARY } from "@/engine/colourDictionary";
export function arcColorsForStory(story) {
  const pts = story.savedArcPoints;
  if (pts && pts.length > 0) {
    return pts.map(
      (p) => COLOUR_DICTIONARY[p.dominant]?.primary.hex ?? "#6b6b6b"
    );
  }
  if (story.chromaticArc?.length) return story.chromaticArc;
  return ["hsl(174,50%,45%)", "hsl(270,40%,48%)", "hsl(350,55%,42%)", "hsl(35,80%,52%)"];
}
