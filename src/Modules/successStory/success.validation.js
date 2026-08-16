import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// ─── CREATE SUCCESS STORY ────────────────────────────────────────────────────
export const createSuccessStory = Joi.object({
  studentName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      "string.empty": "Student name is required",
      "string.min": "Student name must be at least 2 characters",
      "string.max": "Student name cannot exceed 100 characters",
      "any.required": "Student name is required",
    }),

  studentMark: Joi.alternatives()
    .try(Joi.string().min(1).max(50), Joi.number())
    .required()
    .messages({
      "any.required": "Student mark/grade is required",
    }),

  description: Joi.string()
    .min(5)
    .max(3000)
    .required()
    .messages({
      "string.empty": "Description is required",
      "string.min": "Description must be at least 5 characters",
      "string.max": "Description cannot exceed 3000 characters",
      "any.required": "Description is required",
    }),

  courseName: Joi.string()
    .min(2)
    .max(150)
    .required()
    .messages({
      "string.empty": "Course name is required",
      "string.min": "Course name must be at least 2 characters",
      "string.max": "Course name cannot exceed 150 characters",
      "any.required": "Course name is required",
    }),

  teacherName: Joi.string()
    .min(2)
    .max(150)
    .required()
    .messages({
      "string.empty": "Teacher name is required",
      "string.min": "Teacher name must be at least 2 characters",
      "string.max": "Teacher name cannot exceed 150 characters",
      "any.required": "Teacher name is required",
    }),

  rating: Joi.number().min(1).max(5).default(5).optional(),

  featured: Joi.boolean().default(false).optional(),

  isApproved: Joi.boolean().default(true).optional(),

  studentId: Joi.string().pattern(objectIdPattern).allow("", null).optional(),

  courseId: Joi.string().pattern(objectIdPattern).allow("", null).optional(),

  teacherId: Joi.string().pattern(objectIdPattern).allow("", null).optional(),

  image: Joi.any().optional(),
  file: Joi.any().optional(),
});

// ─── UPDATE SUCCESS STORY ────────────────────────────────────────────────────
export const updateSuccessStory = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid success story ID format",
      "any.required": "Success story ID is required",
    }),

  studentName: Joi.string().min(2).max(100).optional(),

  studentMark: Joi.alternatives()
    .try(Joi.string().min(1).max(50), Joi.number())
    .optional(),

  description: Joi.string().min(5).max(3000).optional(),

  courseName: Joi.string().min(2).max(150).optional(),

  teacherName: Joi.string().min(2).max(150).optional(),

  rating: Joi.number().min(1).max(5).optional(),

  featured: Joi.boolean().optional(),

  isApproved: Joi.boolean().optional(),

  studentId: Joi.string().pattern(objectIdPattern).allow("", null).optional(),

  courseId: Joi.string().pattern(objectIdPattern).allow("", null).optional(),

  teacherId: Joi.string().pattern(objectIdPattern).allow("", null).optional(),

  image: Joi.any().optional(),
  file: Joi.any().optional(),
});

// ─── GET SUCCESS STORIES (filters + pagination) ──────────────────────────────
export const getSuccessStories = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),

  featured: Joi.boolean().optional(),
  courseName: Joi.string().optional(),
  teacherName: Joi.string().optional(),

  search: Joi.string().optional(),
  sort: Joi.string().default("-featured -createdAt").optional(),
});

// ─── ID PARAM ────────────────────────────────────────────────────────────────
export const storyIdParam = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid success story ID format",
      "any.required": "Success story ID is required",
    }),
});
