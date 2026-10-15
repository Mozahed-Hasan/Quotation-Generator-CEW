import { PAD_DATA_URL } from "./padData";

let cachedPad = null;

/**
 * Robust pad letterhead loader (Header + Watermark + Footer)
 * Uses embedded Base64 data URL first so it never fails due to network,
 * offline mode, browser cache, or fetch glitches.
 */
export async function getPadImage() {
  if (cachedPad) return cachedPad;

  // 1. Guaranteed embedded Base64 (0ms latency, zero network dependency)
  if (PAD_DATA_URL && PAD_DATA_URL.startsWith("data:image")) {
    cachedPad = { dataUrl: PAD_DATA_URL, fmt: "PNG" };
    return cachedPad;
  }

  // 2. Fallback: fetch from /pad.png
  try {
    const res = await fetch("/pad.png", { cache: "force-cache" });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(blob);
      });
      cachedPad = { dataUrl, fmt: "PNG" };
      return cachedPad;
    }
  } catch (err) {
    console.warn("fetch(/pad.png) failed, attempting Image fallback", err);
  }

  // 3. Fallback: HTML Image + Canvas
  try {
    if (typeof window !== "undefined") {
      const dataUrl = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = "/pad.png";
      });
      cachedPad = { dataUrl, fmt: "PNG" };
      return cachedPad;
    }
  } catch (err) {
    console.error("All pad image loading attempts failed:", err);
  }

  return cachedPad;
}
