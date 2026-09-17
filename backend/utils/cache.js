/**
 * Simple In-Memory Cache for Stable Data
 * For 1 year MERN dev: easy to understand
 * 
 * Guide: Cache stable data that rarely changes
 * - Shop settings
 * - Categories
 * - Brands
 * - Units
 * - User permissions
 * 
 * Don't add Redis initially, start with simple Map + TTL
 * Later you can add Redis when needed
 */

class SimpleCache {
  constructor() {
    this.cache = new Map(); // key -> { value, expiry }
  }

  // Set with TTL (time to live in seconds)
  set(key, value, ttlSeconds = 300) {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  // Get if not expired
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  // Delete
  del(key) {
    this.cache.delete(key);
  }

  // Clear all
  clear() {
    this.cache.clear();
  }

  // Size
  size() {
    return this.cache.size;
  }
}

// Single instance for whole app
const cache = new SimpleCache();

// Helper: cache middleware for Express
// Usage: app.get("/api/categories", cacheMiddleware(300), controller)
const cacheMiddleware = (ttlSeconds = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const key = `__cache__${req.originalUrl}`;
    const cached = cache.get(key);
    if (cached) {
      // Return cached response
      return res.status(200).json(cached);
    }

    // Save original json method
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      // Cache the response before sending
      cache.set(key, data, ttlSeconds);
      return originalJson(data);
    };
    next();
  };
};

module.exports = { cache, cacheMiddleware, SimpleCache };
