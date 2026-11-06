import mongoose from "mongoose";

// The document ID is the token's SHA-256 digest. MongoDB removes expired entries.
const schema = new mongoose.Schema({
  _id: String,
  expiresAt: { type: Date, index: { expires: 0 } },
}, { versionKey: false });

export default mongoose.models.RevokedSession || mongoose.model("RevokedSession", schema);
