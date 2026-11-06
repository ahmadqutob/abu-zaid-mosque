import mongoose, { Schema, model, Types } from "mongoose";
// console.log("User model loaded");

const userSchema = new Schema({
  userName: {
    type: String,
    required: [true, "userName is requiredd"],
    minlength: [2, "Username must be at least 2 characters long"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "password is required"],
  },
  changePasswordTime: {
    type: Date,
  },

  forgetPassword: {
    type: String,
    default: "",
    select: false,
  } ,
  forgetPasswordHash: {
    type: String,
    default: "",
    select: false,
  },
  forgetPasswordExpiresAt: {
    type: Date,
    default: null,
    select: false,
  },
  forgetPasswordAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  forgetPasswordRequestedAt: {
    type: Date,
    default: null,
    select: false,
  },
  confirmEmail: {
    type: Boolean,
    default: false,
    required: [true, "Email confirmation status is required"],
  },

  role: {
    type: String,
    enum: ["superAdmin", "admin", "teacher", "student", "user"],
    default: "user",
  },
  gender: {
    type: String,
    enum: ["male", "female"],
    required: [true, "Gender is required"],
  },
  phone: {
    type: String,
    trim: true,
    required: [true, "Phone number is required"],
  },

  verificationTokenId:{
    type: String,
    default: null,
  },
  lockUntil: {
    type: Date,
    default: null,
  },
  deletedAt: {
    type: Date,
    default: null,
    index: true,
  }
}, {
  timestamps: true,
});

const userModel = mongoose.models.User || model("User", userSchema);
export default userModel;
