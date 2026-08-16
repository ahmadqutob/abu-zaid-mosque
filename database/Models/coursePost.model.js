import mongoose, { Schema, model } from "mongoose";

const coursePostSchema = new Schema(
  {
    // ─── Relations ──────────────────────────────────────────────
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author ID is required"],
    },

    // ─── Content ────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["advice", "announcment", "announcement", "search"],
        message: "{VALUE} is not a valid post type",
      },
      default: "announcement",
      required: [true, "Post type is required"],
    },

    // ─── Extras ─────────────────────────────────────────────────
    pinned: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        url: { type: String, trim: true },
        public_id: { type: String, trim: true },
        name: { type: String, trim: true },
      },
    ],

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

// Compound index for querying posts by course ordered by pinned and date
coursePostSchema.index({ courseId: 1, pinned: -1, createdAt: -1 });

const coursePostModel = mongoose.models.CoursePost || model("CoursePost", coursePostSchema);
export default coursePostModel;
