import mongoose, { Schema, model } from "mongoose";

const successStorySchema = new Schema(
  {
    // ─── Testimonial Basic Info ──────────────────────────────────
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    studentMark: {
      type: String,
      required: [true, "Student mark/grade is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Story description is required"],
      trim: true,
    },
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    teacherName: {
      type: String,
      required: [true, "Teacher name is required"],
      trim: true,
    },

    // ─── Testimonial Media ───────────────────────────────────────
    image: {
      url: { type: String, default: null },
      public_id: { type: String, default: null },
    },

    // ─── Enhancements ────────────────────────────────────────────
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      default: 5,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },

    // ─── Optional Entity References ──────────────────────────────
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // ─── Lifecycle ───────────────────────────────────────────────
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

successStorySchema.index({ featured: -1, createdAt: -1 });
successStorySchema.index({ courseName: "text", studentName: "text", teacherName: "text" });

const successStoryModel = mongoose.models.SuccessStory || model("SuccessStory", successStorySchema);
export default successStoryModel;
