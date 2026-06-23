/**
 * Pollinations image URLs often fail in <img> when the browser sends a Referer
 * (hotlink protection). In dev we proxy via Vite so requests are same-origin.
 * Always use sceneImageSrcForDisplay() when binding img src.
 */
export function buildPollinationsImageUrl(encodedPrompt: string, seed: number): string {
  const qs = `width=512&height=680&seed=${seed}&model=flux&nologo=true&enhance=true`
  if (import.meta.env.DEV) {
    return `/pollinations/prompt/${encodedPrompt}?${qs}`
  }
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?${qs}`
}

export function sceneImageSrcForDisplay(url: string): string {
  if (!url) return url
  if (import.meta.env.DEV && url.includes('image.pollinations.ai')) {
    try {
      const u = new URL(url)
      return `/pollinations${u.pathname}${u.search}`
    } catch {
      return url
    }
  }
  return url
}
