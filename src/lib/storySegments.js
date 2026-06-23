export function migrateLegacySceneGallery(content, gallery) {
  if (!gallery.length) return [];
  const hasAll = gallery.every((g) => typeof g.insertedAt === "number");
  if (hasAll) return [...gallery].sort((a, b) => a.insertedAt - b.insertedAt);
  const n = gallery.length;
  if (n === 1) {
    return [{ ...gallery[0], insertedAt: content.length }];
  }
  const inferred = gallery.map((g, i) => ({
    ...g,
    insertedAt: Math.floor(content.length * (i + 1) / (n + 1))
  }));
  return inferred.sort((a, b) => a.insertedAt - b.insertedAt);
}
export function splitSegments(content, images) {
  if (!images.length) return [content];
  const sorted = [...images].sort((a, b) => a.insertedAt - b.insertedAt);
  const segs = [];
  let start = 0;
  for (const img of sorted) {
    const end = Math.min(img.insertedAt, content.length);
    segs.push(content.slice(start, end));
    start = end;
  }
  segs.push(content.slice(start));
  return segs;
}
export function joinSegments(segments) {
  return segments.join("");
}
export function insertedAtFromSegments(segments) {
  const out = [];
  let pos = 0;
  for (let i = 0; i < segments.length - 1; i++) {
    pos += segments[i].length;
    out.push(pos);
  }
  return out;
}
