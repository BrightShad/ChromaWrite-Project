export function buildPollinationsImageUrl(encodedPrompt, seed) {
  const qs = `width=800&height=500&seed=${seed}&model=flux&nologo=true&enhance=true`;
  if (import.meta.env.DEV) {
    return `/pollinations/prompt/${encodedPrompt}?${qs}`;
  }
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${qs}`;
}
export function sceneImageSrcForDisplay(url) {
  if (!url) return url;
  if (import.meta.env.DEV && url.includes("image.pollinations.ai")) {
    try {
      const u = new URL(url);
      return `/pollinations${u.pathname}${u.search}`;
    } catch {
      return url;
    }
  }
  return url;
}
