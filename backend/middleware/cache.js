// server/middleware/cache.js
// ─── Drop-in server-side cache for any Express route ──────────────────────
// Usage:  router.get("/dashboard", cache("se-dashboard", 300), handler)
//
// Install:  npm install node-cache

import NodeCache from "node-cache";

// ─── Shared cache instance (singleton across all route files) ──────────────
export const appCache = new NodeCache({
  stdTTL: 300,         // default TTL: 5 minutes
  checkperiod: 60,     // scan for expired keys every 60s
  useClones: false,    // faster — we won't mutate cached objects
});

/**
 * Express middleware factory.
 *
 * @param {string} key   - Cache key (e.g. "se-dashboard")
 * @param {number} ttl   - Seconds to cache (default: stdTTL from above)
 *
 * Example:
 *   router.get("/api/structural/dashboard", cache("se-dashboard"), dashboardHandler);
 *   router.get("/api/structural/boq",       cache("se-boq", 120),  boqHandler);
 */
export function cache(key, ttl) {
  return (req, res, next) => {
    const cached = appCache.get(key);
    if (cached !== undefined) {
      // ⚡ Cache hit — return instantly, never touches DB
      return res.json(cached);
    }

    // ── Monkey-patch res.json so we intercept the response ────────────────
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        appCache.set(key, data, ttl);   // store in cache
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Call this after any write (POST/PUT/DELETE) that affects cached data.
 * Pass one key or an array of keys.
 *
 * Example in a route handler:
 *   await Drawing.create(data);
 *   invalidate(["se-dashboard", "se-drawings"]);
 */
export function invalidate(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  list.forEach((k) => appCache.del(k));
}


// ─── USAGE EXAMPLE (paste into your routes file) ──────────────────────────
/*
import { cache, invalidate } from "../middleware/cache.js";

// ── GET routes (reads) — add cache middleware ──────────────────────────────
router.get("/api/structural/dashboard",  cache("se-dashboard"),      getDashboard);
router.get("/api/structural/drawings",   cache("se-drawings", 120),  getDrawings);
router.get("/api/structural/boq",        cache("se-boq", 120),       getBOQ);
router.get("/api/analysis",              cache("se-analysis", 120),  getAnalysis);
router.get("/rfis",                      cache("se-rfis", 60),       getRFIs);

// ── POST/PUT/DELETE routes (writes) — invalidate affected caches ───────────
router.post("/api/structural/upload-drawing", async (req, res) => {
  // ... your existing drawing upload logic ...
  invalidate(["se-drawings", "se-dashboard"]);   // ← add this line
  res.json(newDrawing);
});

router.put("/api/structural/drawings/:id/status", async (req, res) => {
  // ... your existing status update logic ...
  invalidate(["se-drawings", "se-dashboard"]);
  res.json(updated);
});

router.post("/rfis", async (req, res) => {
  // ... your existing RFI create logic ...
  invalidate(["se-rfis", "se-dashboard"]);
  res.json(newRFI);
});

router.put("/rfis/:id/status", async (req, res) => {
  // ... existing logic ...
  invalidate("se-rfis");
  res.json(updated);
});
*/