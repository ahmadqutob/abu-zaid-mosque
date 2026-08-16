import mongoose, { Schema, model } from "mongoose";

const markSchema = new Schema(
  {
    // ─── Relations ──────────────────────────────────────────────
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student ID is required"],
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Graded by user ID is required"],
    },

    // ─── Mark Details ───────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Assessment type is required"],
      enum: {
        values: ["quiz", "exam", "assignment", "project", "oral", "other"],
        message: "{VALUE} is not a valid assessment type",
      },
      default: "quiz",
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: [0, "Score cannot be negative"],
    },
    maxScore: {
      type: Number,
      required: [true, "Max score is required"],
      min: [0, "Max score cannot be negative"],
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },

    // ─── Status & Lifecycle ──────────────────────────────────────
    softDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure score <= maxScore on save
markSchema.pre("save", function (next) {
  if (this.score > this.maxScore) {
    return next(new Error("Score cannot exceed maximum score"));
  }
  next();
});

// Ensure score <= maxScore on update queries
markSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const score = update.score ?? update.$set?.score;
  const maxScore = update.maxScore ?? update.$set?.maxScore;

  if (score !== undefined && maxScore !== undefined && score > maxScore) {
    return next(new Error("Score cannot exceed maximum score"));
  }
  next();
});

// Compound indexes for fast lookups
markSchema.index({ courseId: 1, studentId: 1 });
markSchema.index({ studentId: 1 });
markSchema.index({ courseId: 1 });

const markModel = mongoose.models.Marks || model("Marks", markSchema);
export default markModel;
