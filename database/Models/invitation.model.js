import mongoose from "mongoose";

const invitationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: {
    type: String,
    enum: ["teacher", "student", "admin", "superAdmin"],
    required: true,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  acceptedAt: { type: Date, default: null },
}, { timestamps: true });

invitationSchema.index({ userId: 1, role: 1, acceptedAt: 1 });

export default mongoose.models.Invitation || mongoose.model("Invitation", invitationSchema);
