import { createClient } from "redis";
import jwt from "jsonwebtoken";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Stop trying to reconnect after the first failure to prevent terminal spam
      if (retries >= 1) {
        return false;
      }
      return 1000; // retry once after 1 second
    }
  }
});

let isRedisConnected = false;

redisClient.on("error", (err) => {
  // Only log client errors if we were previously connected, avoiding initial connection spam
  if (isRedisConnected) {
    console.error("Redis Client Error:", err.message);
  }
  isRedisConnected = false;
});

redisClient.on("connect", () => {
  isRedisConnected = true;
  console.log("Redis client connected.");
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Redis connection failed. Falling back to in-memory blacklist:", err.message);
    isRedisConnected = false;
  }
})();

const memoryBlacklist = new Set();

/**
 * Add a token to the blacklist (used during logout)
 * @param {string} token - JWT token to revoke
 */
export const revokeToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    const now = Math.floor(Date.now() / 1000);
    
    // Default expiration of 12 hours (43200 seconds) if no exp claim is found
    let ttl = 43200; 
    if (decoded && decoded.exp) {
      ttl = Math.max(0, decoded.exp - now);
    }

    if (ttl <= 0) return; // Token is already expired, no need to blacklist

    if (isRedisConnected) {
      await redisClient.set(`blacklist:${token}`, "revoked", {
        EX: ttl,
      });
    } else {
      memoryBlacklist.add(token);
      setTimeout(() => {
        memoryBlacklist.delete(token);
      }, ttl * 1000);
    }
  } catch (error) {
    console.error("Error revoking token:", error);
    memoryBlacklist.add(token);
  }
};

/**
 * Check if a token is revoked
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} - true if token is revoked, false otherwise
 */
export const isTokenRevoked = async (token) => {
  try {
    if (isRedisConnected) {
      const result = await redisClient.get(`blacklist:${token}`);
      return result === "revoked";
    }
    return memoryBlacklist.has(token);
  } catch (error) {
    console.error("Error checking token blacklist:", error);
    return memoryBlacklist.has(token);
  }
};

/**
 * Clear a specific token from blacklist (optional - for cleanup)
 * @param {string} token - JWT token to remove
 */
export const clearToken = async (token) => {
  try {
    if (isRedisConnected) {
      await redisClient.del(`blacklist:${token}`);
    } else {
      memoryBlacklist.delete(token);
    }
  } catch (error) {
    console.error("Error clearing token:", error);
  }
};

/**
 * Clear all tokens from blacklist (optional - for reset)
 */
export const clearAllTokens = async () => {
  try {
    if (isRedisConnected) {
      const keys = await redisClient.keys("blacklist:*");
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } else {
      memoryBlacklist.clear();
    }
  } catch (error) {
    console.error("Error clearing blacklist:", error);
  }
};
