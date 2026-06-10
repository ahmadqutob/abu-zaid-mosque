import mongoose, { Schema, model, Types } from "mongoose";

const postSchema = new Schema({
  title: {
    type: String,
    required: [true, "Post title is required"],
    minlength: [5, "Title must be at least 5 characters long"],
    maxlength: [100, "Title cannot exceed 100 characters"],
    trim: true,
  },
  slug: {
    type: String,
    
     lowercase: true,
    trim: true,
    index: true,
  },
  content: { //the main body of the post
    type: String,
    required: [true, "Post content is required"],
    minlength: [10, "Content must be at least 50 characters long"],
    maxlength: [5000, "Content cannot exceed 5000 characters"],
  },
  excerpt: { //A short summary or preview of the post
    type: String,
    required: [true, "Post excerpt is required"],
    maxlength: [200, "Excerpt cannot exceed 200 characters"],
    trim: true,
  },

  tags: [{ //keywords related to the post
    type: String,
    trim: true,
    maxlength: [20, "Each tag cannot exceed 20 characters"],
  }],
  mainImage: {
    type: Object,
    required: [true, "Main image is required"],
  },
  subImages: [{
    type: Object,
  }],
  featured: { //show on homepage hero section Differentiate “important” articles (big news, trending).
    type: Boolean,
    default: false,
  },
  published: { //Admins can control when a post goes public.save drafts without showing them to users
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
  },
  views: { //track Counts how many times a post has been read.
    type: Number,
    default: 0,
    min: 0,
  },
  likes: [{
    type: Types.ObjectId,
    ref: "User",
  }],
  author: { //the user who created the post
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  softDelete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

 
const postModel = mongoose.models.Post || model("Post", postSchema);
export default postModel;
