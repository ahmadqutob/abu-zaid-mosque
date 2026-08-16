import mongoose, { Schema, model } from "mongoose";

const courseSchema = new Schema(
  {
    // ─── Relations ──────────────────────────────────────────────
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher ID is required"],
    },

    // ─── Basic Info ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Tajweed", "Hifz", "Qiraah", "Arabic", "Islamic Studies", "Other"],
        message: "{VALUE} is not a valid category",
      },
      trim: true,
    },

    // ─── Audience ────────────────────────────────────────────────
    level: {
      type: String,
      required: [true, "Level is required"],
      enum: {
        values: ["beginner", "intermediate", "advanced"],
        message: "{VALUE} is not a valid level",
      },
    },
    gender: {
      type: String,
      required: [true, "Gender target is required"],
      enum: {
        values: ["male", "female", "mixed"],
        message: "{VALUE} is not a valid gender option",
      },
    },
    minAge: {
      type: Number,
      required: [true, "Minimum age is required"],
      min: [0, "Age cannot be negative"],
    },
    maxAge: {
      type: Number,
      required: [true, "Maximum age is required"],
      min: [0, "Age cannot be negative"],
    },

    // ─── Schedule & Session ──────────────────────────────────────
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    schedule: {
      // e.g. { days: ["Monday", "Wednesday"], time: "17:00", recurring: true }
      type: Schema.Types.Mixed,
      required: [true, "Schedule is required"],
    },
    sessionType: {
      type: String,
      required: [true, "Session type is required"],
      enum: {
        values: ["onsite", "online", "hybrid"],
        message: "{VALUE} is not a valid session type",
      },
    },
    location: {
      type: String,
      trim: true,
      default: null, // nullable when online
    },

    // ─── Enrollment ──────────────────────────────────────────────
    enrollmentStatus: {
      type: String,
      required: [true, "Enrollment status is required"],
      enum: {
        values: ["upcoming", "open", "ongoing", "closed"],
        message: "{VALUE} is not a valid enrollment status",
      },
      default: "upcoming",
    },
    maxStudents: {
      type: Number,
      required: [true, "Max students limit is required"],
      min: [1, "Max students must be at least 1"],
    },
    currentStudentsCount: {
      type: Number,
      default: 0,
      min: [0, "Current students count cannot be negative"],
    },

    // ─── Pricing ─────────────────────────────────────────────────
    isFree: {
      type: Boolean,
      required: [true, "isFree flag is required"],
      default: false,
    },
    price: {
      // null when isFree = true
      type: Number,
      default: null,
      min: [0, "Price cannot be negative"],
    },

    // ─── Extras ──────────────────────────────────────────────────
    certificate: {
      type: Boolean,
      required: [true, "Certificate availability flag is required"],
      default: false,
    },
    requirements: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // ─── Lifecycle ───────────────────────────────────────────────
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["draft", "active", "archived", "cancelled"],
        message: "{VALUE} is not a valid status",
      },
      default: "draft",
    },
    softDelete: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { 
  timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },  }
);

// ─── Pre-save hooks ─────────────────────────────────────────────

// Auto-set price to null when isFree is true
courseSchema.pre("save", function (next) {
  if (this.isFree) {
    this.price = null;
  }
  // Ensure maxAge >= minAge
  if (this.maxAge < this.minAge) {
    return next(new Error("maxAge cannot be less than minAge"));
  }
  next();
});

courseSchema.pre(["findOneAndUpdate", "updateOne", "updateMany"], function (next) {
  const update = this.getUpdate();
  if (!update) return next();

  const isFree = update.isFree ?? update.$set?.isFree;

  if (isFree === true) {
    if (update.$set) {
      update.$set.price = null;
    } else {
      update.price = null;
    }
    this.setUpdate(update);
  }

  next();
});

courseSchema.virtual("isWaitlistActive").get(function () {
  return this.currentStudentsCount >= this.maxStudents;
});


const courseModel = mongoose.models.Course || model("Course", courseSchema);
export default courseModel;
