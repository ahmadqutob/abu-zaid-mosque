// models/MosqueFeatures.js
import mongoose from "mongoose";

const mosqueFeaturesSchema = new mongoose.Schema(
  {
    features: {
      courses: { type: Boolean, default: false },
      facilityRental: { type: Boolean, default: false },
      donations: { type: Boolean, default: true },
      events: { type: Boolean, default: true },
      library: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Enforce singleton at the application level — only ever one document
export default mongoose.model("MosqueFeatures", mosqueFeaturesSchema);