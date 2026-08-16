import mongoose, { Schema, model } from "mongoose";

const studentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
    unique: true,
  },
  studentNumber: {
    type: String,
    required: [true, "Student number is required"],
    unique: true,
    trim: true,
  },
  parentName: {
    type: String,
    trim: true,
  },
  parentPhone: {
    type: String,
    trim: true,
  },
  parentEmail: {
    type: String,
    trim: true,
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
  level: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "graduated", "suspended"],
    default: "active",
  },
  gpa: {
    type: Number,
    default: 0,
    min: 0,
    max: 4,
  },
  coursesEnrolled: {
    type: [String],
    default: [],
  },
  bio: {
    type: String,
    trim: true,
  },
  level: {
    type: String,
    trim: true,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },
}, {
  timestamps: true,
});


studentSchema.index({ status: 1 });
studentSchema.index({ enrollmentDate: 1 });

const studentModel = mongoose.models.Student || model("Student", studentSchema);

export default studentModel;
