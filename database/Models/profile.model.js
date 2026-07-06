import mongoose, { Schema, model } from "mongoose";

const profileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
    unique: true,
  },
  dateOfBirth: {
    type: Date,
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});



const profileModel = mongoose.models.Profile || model("Profile", profileSchema);

export default profileModel;
