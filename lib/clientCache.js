// In-memory + sessionStorage client cache for instant page switches without 0-flash
const memoryCache = new Map();

export function getClientCache(key, fallback = null) {
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem("cew_c_" + key);
      if (raw) {
        const parsed = JSON.parse(raw);
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch {}
  }
  return fallback;
}

export function setClientCache(key, data, persist = true) {
  memoryCache.set(key, data);
  if (persist && typeof window !== "undefined") {
    try {
      sessionStorage.setItem("cew_c_" + key, JSON.stringify(data));
    } catch {}
  }
}

export function clearClientCache(key) {
  if (key) {
    memoryCache.delete(key);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("cew_c_" + key);
      } catch {}
    }
  } else {
    memoryCache.clear();
  }
}
