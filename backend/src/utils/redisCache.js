import Redis from 'ioredis';

let redisClient = null;
let isRedisConnected = false;

try {
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;
  if (redisUrl) {
    redisClient = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null // Don't keep retrying endlessly if redis is down
    });
  } else {
    redisClient = new Redis({
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null
    });
  }

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('[Redis] Connected successfully');
  });

  redisClient.on('error', (err) => {
    isRedisConnected = false;
    // Suppress spammy connection errors if redis server is not running
  });

  // Attempt lazy connection
  redisClient.connect().catch(() => {
    isRedisConnected = false;
  });
} catch (e) {
  isRedisConnected = false;
  redisClient = null;
}

const inMemoryCache = new Map();

export async function getCache(key) {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    } catch (err) {
      // Fall back to in-memory cache
    }
  }

  const entry = inMemoryCache.get(key);
  if (entry) {
    if (Date.now() < entry.expiry) {
      return entry.data;
    }
    inMemoryCache.delete(key);
  }
  return null;
}

export async function setCache(key, value, ttlSeconds = 300) {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      // Ignore Redis write failure
    }
  }

  inMemoryCache.set(key, {
    data: value,
    expiry: Date.now() + ttlSeconds * 1000
  });
}

export async function invalidateAnalyticsCache() {
  inMemoryCache.clear();
  if (!isRedisConnected || !redisClient) return;
  try {
    const keys = await redisClient.keys('analytics:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    // Ignore cache invalidation failures
  }
}

export default redisClient;

