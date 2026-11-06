import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import RevokedSession from "../../database/Models/revokedSession.model.js";
import { securityRedis } from "./securityStore.services.js";

const digest = token => createHash("sha256").update(token).digest("hex");
const redisKey = id => `mosque:revoked:${id}`;

// Authorization has already verified this JWT. A token with no expiry needs
// a permanent record, so it cannot become valid again after logout.
export async function revokeToken(token) {
  const id = digest(token);
  const { exp } = jwt.decode(token);
  const ttl = exp == null ? null : exp - Math.floor(Date.now() / 1000);
  if (ttl !== null && ttl <= 0) return;

  if (securityRedis) {
    const options = ttl === null ? {} : { expiration: { type: "EXAT", value: exp } };
    await securityRedis.set(redisKey(id), "1", options);
    return;
  }

  const expiresAt = exp == null ? null : new Date(exp * 1000);
  await RevokedSession.updateOne({ _id: id }, { $setOnInsert: { expiresAt } }, {
    upsert: true, writeConcern: { w: "majority" },
  });
}

export async function isTokenRevoked(token) {
  const id = digest(token);
  if (securityRedis) return Boolean(await securityRedis.exists(redisKey(id)));
  return Boolean(await RevokedSession.exists({ _id: id }).read("primary"));
}
