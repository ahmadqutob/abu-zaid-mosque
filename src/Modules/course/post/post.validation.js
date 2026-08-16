import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const POST_TYPES = ["advice", "announcment", "announcement", "search"];

// ─── Attachment Schema ───────────────────────────────────────────────────────
const attachmentItem = Joi.object({
  url: Joi.string().uri().allow("", null).optional(),
  public_id: Joi.string().allow("", null).optional(),
  name: Joi.string().allow("", null).optional(),
}).unknown(true);

// ─── CREATE COURSE POST ──────────────────────────────────────────────────────
export const createCoursePost = Joi.object({
  courseId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),

  title: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      "string.empty": "Title is required",
      "string.min": "Title must be at least 3 characters",
      "string.max": "Title cannot exceed 200 characters",
      "any.required": "Title is required",
    }),

  content: Joi.string()
    .min(3)
    .required()
    .messages({
      "string.empty": "Content is required",
      "string.min": "Content must be at least 3 characters",
      "any.required": "Content is required",
    }),

  type: Joi.string()
    .valid(...POST_TYPES)
    .default("announcement")
    .optional()
    .messages({
      "any.only": `Post type must be one of: ${POST_TYPES.join(", ")}`,
    }),

  pinned: Joi.boolean().default(false).optional(),

  attachments: Joi.array()
    .items(Joi.alternatives().try(attachmentItem, Joi.string()))
    .optional(),
});

// ─── UPDATE COURSE POST ──────────────────────────────────────────────────────
export const updateCoursePost = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid post ID format",
      "any.required": "Post ID is required",
    }),

  courseId: Joi.string().pattern(objectIdPattern).optional(),

  title: Joi.string().min(3).max(200).optional(),

  content: Joi.string().min(3).optional(),

  type: Joi.string()
    .valid(...POST_TYPES)
    .optional()
    .messages({
      "any.only": `Post type must be one of: ${POST_TYPES.join(", ")}`,
    }),

  pinned: Joi.boolean().optional(),

  attachments: Joi.array()
    .items(Joi.alternatives().try(attachmentItem, Joi.string()))
    .optional(),
});

// ─── GET COURSE POSTS (filters + pagination) ─────────────────────────────────
export const getCoursePosts = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),

  courseId: Joi.string().pattern(objectIdPattern).optional(),
  type: Joi.string().valid(...POST_TYPES).optional(),
  pinned: Joi.boolean().optional(),

  search: Joi.string().optional(),
  sort: Joi.string().default("-pinned -createdAt").optional(),
});

// ─── ID PARAMS ───────────────────────────────────────────────────────────────
export const postIdParam = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid post ID format",
      "any.required": "Post ID is required",
    }),
});

export const courseIdParam = Joi.object({
  courseId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
});
