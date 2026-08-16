import mongoose, { Schema, model, Types } from "mongoose";

const commentSchema = new Schema({
  user: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: [true, "Comment content is required"],
    trim: true,
    maxlength: [1000, "Comment cannot exceed 1000 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const postSchema = new Schema({
  title: {
    type: String,
    required: [true, "Title is required"],
    trim: true,
    minlength: [5, "Title must be at least 5 characters long"],
    maxlength: [150, "Title cannot exceed 150 characters"],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  content: {
    type: String,
    required: [true, "Content is required"],
    trim: true,
    minlength: [10, "Content must be at least 10 characters long"],
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [300, "Excerpt cannot exceed 300 characters"],
  },
  category: {
    type: String,
    enum: [
      "announcement",
      "lecture",
      "quran_competition",
      "friday_sermon",
      "event",
      "charity",
      "prayer_schedule",
      "general",
    ],
    default: "general",
    index: true,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  mainImage: {
    url: { type: String, required: true },
    public_id: { type: String, required: true },
  },
  subImages: [
    {
      url: { type: String },
      public_id: { type: String },
    },
  ],
  author: {
    type: Types.ObjectId,
    ref: "User",
    required: [true, "Author is required"],
    index: true,
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true,
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  published: {
    type: Boolean,
    default: true,
    index: true,
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  likes: [
    {
      type: Types.ObjectId,
      ref: "User",
    },
  ],
  likesCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  comments: [commentSchema],
  commentsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  allowComments: {
    type: Boolean,
    default: true,
  },
  eventDate: {
    type: Date,
    default: null,
  },
  softDelete: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index for title/content search
postSchema.index({ title: 'text', content: 'text', excerpt: 'text' });

const postModel = mongoose.models.Post || model("Post", postSchema);
export default postModel;
