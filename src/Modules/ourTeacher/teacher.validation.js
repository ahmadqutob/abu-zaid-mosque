import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

// ─── CREATE TEACHER PROFILE ──────────────────────────────────────────────────
export const createTeacherProfile = Joi.object({
  userId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid user ID format",
      "any.required": "User ID is required",
    }),

  specialization: Joi.string()
    .min(2)
    .max(200)
    .allow("", null)
    .optional()
    .messages({
      "string.min": "Specialization must be at least 2 characters",
      "string.max": "Specialization cannot exceed 200 characters",
    }),

  qualification: Joi.string()
    .min(2)
    .max(200)
    .allow("", null)
    .optional()
    .messages({
      "string.min": "Qualification must be at least 2 characters",
      "string.max": "Qualification cannot exceed 200 characters",
    }),

  bio: Joi.string()
    .min(5)
    .max(2000)
    .allow("", null)
    .optional()
    .messages({
      "string.min": "Bio must be at least 5 characters",
      "string.max": "Bio cannot exceed 2000 characters",
    }),

  experienceYears: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .optional()
    .messages({
      "number.min": "Experience years cannot be negative",
    }),

  image: Joi.any().optional(),
  file: Joi.any().optional(),
});

// ─── UPDATE TEACHER PROFILE ──────────────────────────────────────────────────
export const updateTeacherProfile = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid teacher ID format",
      "any.required": "Teacher ID is required",
    }),

  specialization: Joi.string().min(2).max(200).allow("", null).optional(),

  qualification: Joi.string().min(2).max(200).allow("", null).optional(),

  bio: Joi.string().min(5).max(2000).allow("", null).optional(),

  experienceYears: Joi.number().integer().min(0).optional(),

  image: Joi.any().optional(),
  file: Joi.any().optional(),
});

// ─── GET TEACHERS (filters + pagination) ─────────────────────────────────────
export const getTeachers = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),

  specialization: Joi.string().optional(),
  search: Joi.string().optional(),
  sort: Joi.string().default("-createdAt").optional(),
});

// ─── ID PARAM ────────────────────────────────────────────────────────────────
export const teacherIdParam = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid ID format",
      "any.required": "ID is required",
    }),
});
