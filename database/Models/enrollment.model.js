// registration.model.js
import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    note: { type: String, default: null }, // optional feedback from teacher
  },
  { timestamps: true }
);

// A student may reapply after a rejected or cancelled application, but can only
// have one pending or approved registration for the same course at a time.
registrationSchema.index(
  { studentId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "approved"] } },
  }
);

export default mongoose.model("Registration", registrationSchema);
