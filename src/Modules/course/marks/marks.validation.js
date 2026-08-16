import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const MARK_TYPES = ["quiz", "exam", "assignment", "project", "oral", "other"];

// ─── CREATE MARK ─────────────────────────────────────────────────────────────
export const createMark = Joi.object({
  courseId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),

  studentId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid student ID format",
      "any.required": "Student ID is required",
    }),

  title: Joi.string()
    .min(2)
    .max(150)
    .required()
    .messages({
      "string.empty": "Title is required",
      "string.min": "Title must be at least 2 characters",
      "string.max": "Title cannot exceed 150 characters",
      "any.required": "Title is required",
    }),

  type: Joi.string()
    .valid(...MARK_TYPES)
    .default("quiz")
    .optional()
    .messages({
      "any.only": `Assessment type must be one of: ${MARK_TYPES.join(", ")}`,
    }),

  score: Joi.number()
    .min(0)
    .required()
    .messages({
      "number.base": "Score must be a number",
      "number.min": "Score cannot be negative",
      "any.required": "Score is required",
    }),

  maxScore: Joi.number()
    .min(0)
    .required()
    .messages({
      "number.base": "Max score must be a number",
      "number.min": "Max score cannot be negative",
      "any.required": "Max score is required",
    }),

  feedback: Joi.string()
    .allow("", null)
    .max(2000)
    .optional()
    .messages({
      "string.max": "Feedback cannot exceed 2000 characters",
    }),

  gradedBy: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({
      "string.pattern.base": "Invalid gradedBy user ID format",
    }),
});

// ─── UPDATE MARK ─────────────────────────────────────────────────────────────
export const updateMark = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid mark ID format",
      "any.required": "Mark ID is required",
    }),

  courseId: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({
      "string.pattern.base": "Invalid course ID format",
    }),

  studentId: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({
      "string.pattern.base": "Invalid student ID format",
    }),

  title: Joi.string().min(2).max(150).optional(),

  type: Joi.string()
    .valid(...MARK_TYPES)
    .optional()
    .messages({
      "any.only": `Assessment type must be one of: ${MARK_TYPES.join(", ")}`,
    }),

  score: Joi.number().min(0).optional(),

  maxScore: Joi.number().min(0).optional(),

  feedback: Joi.string().allow("", null).max(2000).optional(),

  gradedBy: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({
      "string.pattern.base": "Invalid gradedBy user ID format",
    }),
});

// ─── GET MARKS (filters + pagination) ───────────────────────────────────────
export const getMarks = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),

  courseId: Joi.string().pattern(objectIdPattern).optional(),
  studentId: Joi.string().pattern(objectIdPattern).optional(),
  type: Joi.string().valid(...MARK_TYPES).optional(),

  search: Joi.string().optional(),
  sort: Joi.string().default("-createdAt").optional(),
});

// ─── ID PARAMS ───────────────────────────────────────────────────────────────
export const markId = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid mark ID format",
      "any.required": "Mark ID is required",
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

export const studentIdParam = Joi.object({
  studentId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid student ID format",
      "any.required": "Student ID is required",
    }),
});
