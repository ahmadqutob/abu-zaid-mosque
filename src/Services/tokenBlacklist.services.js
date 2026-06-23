// In-memory token blacklist for revoked/logged-out tokens
const tokenBlacklist = new Set();

/**
 * Add a token to the blacklist (used during logout)
 * @param {string} token - JWT token to revoke
 */
export const revokeToken = (token) => {
    tokenBlacklist.add(token);
};

/**
 * Check if a token is revoked
 * @param {string} token - JWT token to check
 * @returns {boolean} - true if token is revoked, false otherwise
 */
export const isTokenRevoked = (token) => {
    return tokenBlacklist.has(token);
};

/**
 * Clear a specific token from blacklist (optional - for cleanup)
 * @param {string} token - JWT token to remove
 */
export const clearToken = (token) => {
    tokenBlacklist.delete(token);
};

/**
 * Clear all tokens from blacklist (optional - for reset)
 */
export const clearAllTokens = () => {
    tokenBlacklist.clear();
};
