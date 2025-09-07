const LRU = require('../utils/lru');

const cache = new LRU(500, { defaultTTL: 30 * 1000 });

function cacheMiddleware(req, res, next) {
  if (req.method !== "GET") return next();

  const key = `${req.method}:${req.originalUrl}`;
  const cached = cache.get(key);

  if (cached !== undefined) {
    return res.json(cached);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    cache.put(key, body);
    return originalJson(body);
  };

  next();
}
function invalidateCacheForOrder(orderId) {
  const keys = cache.keys();
  const pattern = `/orders/${orderId}`;
  keys.forEach(k => {
    if (k.includes(pattern)) {
      cache.delete(k);
    }
  });
}

module.exports = { cacheMiddleware, invalidateCacheForOrder };
