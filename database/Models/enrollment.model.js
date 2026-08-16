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

// A student can only have ONE active (pending/approved) registration per course
registrationSchema.index(
  { studentId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "approved"] } },
  }
);

export default mongoose.model("Registration", registrationSchema);