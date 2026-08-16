import mongoose, { Schema, model } from "mongoose";

const teacherSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
    unique: true,
  },
  specialization: {
    type: String,
    trim: true,
  },
  qualification: {
    type: String,
    trim: true,
  },
  bio: {
    type: String,
    trim: true,
  },
  experienceYears: {
    type: Number,
    default: 0,
    min: [0, "Years of experience cannot be negative"],
  },
  image: {
    url: { type: String, default: null },
    public_id: { type: String, default: null },
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true,
  },
  createdBy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }
}, {
  timestamps: true,
});



const teacherModel = mongoose.models.Teacher || model("Teacher", teacherSchema);

export default teacherModel;
