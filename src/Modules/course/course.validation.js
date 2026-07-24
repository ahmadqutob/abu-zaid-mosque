import Joi from "joi";

// ─── Helpers ────────────────────────────────────────────────────────────────
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const CATEGORIES = ["Tajweed", "Hifz", "Qiraah", "Arabic", "Islamic Studies", "Other"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const GENDERS = ["male", "female", "mixed"];
const SESSION_TYPES = ["onsite", "online", "hybrid"];
const ENROLLMENT_STATUSES = ["upcoming", "open", "ongoing", "closed"];
const STATUSES = ["draft", "active", "archived", "cancelled"];

// ─── Schedule sub-schema (reusable) ────────────────────────────────────────
const scheduleSchema = Joi.object({
  days: Joi.array()
    .items(
      Joi.string().valid(
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
      )
    )
    .optional(),
  time: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .optional()
    .messages({ "string.pattern.base": "Time must be in HH:MM format" }),
  recurring: Joi.boolean().optional(),
}).unknown(true); // allow extensible schedule fields

// ─── CREATE ─────────────────────────────────────────────────────────────────
export const createCourse = Joi.object({
  teacherId: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid teacher ID format",
      "any.required": "Teacher ID is required",
    }),

  name: Joi.string()
    .min(3)
    .max(150)
    .required()
    .messages({
      "string.empty": "Course name is required",
      "string.min": "Course name must be at least 3 characters",
      "string.max": "Course name cannot exceed 150 characters",
      "any.required": "Course name is required",
    }),

 
  description: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      "string.empty": "Course description is required",
      "string.min": "Course description must be at least 10 characters",
      "string.max": "Course description cannot exceed 5000 characters",
      "any.required": "Course description is required",
    }),

  category: Joi.string()
    .valid(...CATEGORIES)
    .required()
    .messages({
      "any.only": `Category must be one of: ${CATEGORIES.join(", ")}`,
      "any.required": "Category is required",
    }),

  level: Joi.string()
    .valid(...LEVELS)
    .required()
    .messages({
      "any.only": `Level must be one of: ${LEVELS.join(", ")}`,
      "any.required": "Level is required",
    }),

  gender: Joi.string()
    .valid(...GENDERS)
    .required()
    .messages({
      "any.only": `Gender must be one of: ${GENDERS.join(", ")}`,
      "any.required": "Gender target is required",
    }),

  minAge: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      "number.base": "Minimum age must be a number",
      "number.min": "Minimum age cannot be negative",
      "any.required": "Minimum age is required",
    }),

  maxAge: Joi.number()
    .integer()
    .min(Joi.ref("minAge"))
    .required()
    .messages({
      "number.base": "Maximum age must be a number",
      "number.min": "Maximum age must be greater than or equal to minimum age",
      "any.required": "Maximum age is required",
    }),

  startDate: Joi.date()
    .greater("now")
    .required()
    .messages({
      "date.base": "Start date must be a valid date",
      "date.greater": "startDate must be a future date",
      "any.required": "Start date is required",
    }),

  endDate: Joi.date()
    .greater(Joi.ref("startDate"))
    .required()
    .messages({
      "date.base": "End date must be a valid date",
      "date.greater": "endDate must be after startDate",
      "any.required": "End date is required",
    }),

  schedule: scheduleSchema
    .required()
    .messages({ "any.required": "Schedule details are required" }),

  sessionType: Joi.string()
    .valid(...SESSION_TYPES)
    .required()
    .messages({
      "any.only": `Session type must be one of: ${SESSION_TYPES.join(", ")}`,
      "any.required": "Session type is required",
    }),

  location: Joi.string()
    .allow("", null)
    .max(200)
    .optional()
    .messages({ "string.max": "Location cannot exceed 200 characters" }),

  enrollmentStatus: Joi.string()
    .valid(...ENROLLMENT_STATUSES)
    .default("upcoming")
    .optional()
    .messages({ "any.only": `Enrollment status must be one of: ${ENROLLMENT_STATUSES.join(", ")}` }),

  maxStudents: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      "number.base": "Max students must be a number",
      "number.min": "Max students must be at least 1",
      "any.required": "Max students limit is required",
    }),

  isFree: Joi.boolean()
    .required()
    .messages({ "any.required": "isFree flag is required" }),

  price: Joi.when("isFree", {
    is: true,
    then: Joi.number().allow(null).default(null).optional(),
    otherwise: Joi.number()
      .greater(0)
      .required()
      .messages({
        "number.greater": "Price must be greater than 0 for paid courses",
        "any.required": "Price is required when the course is not free",
      }),
  }),

  certificate: Joi.boolean()
    .required()
    .messages({ "any.required": "Certificate availability flag is required" }),

  requirements: Joi.alternatives()
    .try(Joi.object().unknown(true), Joi.array().items(Joi.string()))
    .allow(null)
    .optional(),

  status: Joi.string()
    .valid(...STATUSES)
    .default("draft")
    .optional()
    .messages({ "any.only": `Status must be one of: ${STATUSES.join(", ")}` }),
})



// ─── UPDATE ─────────────────────────────────────────────────────────────────
export const updateCourse = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),

  teacherId: Joi.string()
    .pattern(objectIdPattern)
    .optional()
    .messages({ "string.pattern.base": "Invalid teacher ID format" }),

  name: Joi.string().min(3).max(150).optional(),

  description: Joi.string().min(10).max(5000).optional(),

  category: Joi.string().valid(...CATEGORIES).optional(),

  level: Joi.string().valid(...LEVELS).optional(),

  gender: Joi.string().valid(...GENDERS).optional(),

  minAge: Joi.number().integer().min(0).optional(),

  maxAge: Joi.number()
    .integer()
    .min(0)
    .optional()
    .when("minAge", {
      is: Joi.number().exist(),
      then: Joi.number().min(Joi.ref("minAge")).messages({
        "number.min": "Maximum age must be >= minimum age",
      }),
    }),

  startDate: Joi.date().optional(),

  endDate: Joi.date()
    .optional()
    .when("startDate", {
      is: Joi.date().exist(),
      then: Joi.date().min(Joi.ref("startDate")).messages({
        "date.min": "End date cannot be before start date",
      }),
    }),

  schedule: scheduleSchema.optional(),

  sessionType: Joi.string().valid(...SESSION_TYPES).optional(),

  location: Joi.string().allow("", null).max(300).optional(),

  enrollmentStatus: Joi.string().valid(...ENROLLMENT_STATUSES).optional(),

  maxStudents: Joi.number().integer().min(1).optional(),

  isFree: Joi.boolean().optional(),

  price: Joi.when("isFree", {
    is: true,
    then: Joi.number().allow(null).optional(),
    otherwise: Joi.number().min(0).optional().messages({
      "number.min": "Price cannot be negative",
    }),
  }),

  certificate: Joi.boolean().optional(),

  requirements: Joi.alternatives()
    .try(Joi.object().unknown(true), Joi.array().items(Joi.string()))
    .allow(null)
    .optional(),

  status: Joi.string().valid(...STATUSES).optional(),
});

// ─── GET ALL (filters + pagination) ─────────────────────────────────────────
export const getCourses = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),

  category: Joi.string().valid(...CATEGORIES).optional(),
  level: Joi.string().valid(...LEVELS).optional(),
  gender: Joi.string().valid(...GENDERS).optional(),
  sessionType: Joi.string().valid(...SESSION_TYPES).optional(),
  enrollmentStatus: Joi.string().valid(...ENROLLMENT_STATUSES).optional(),
  status: Joi.string().valid(...STATUSES).optional(),

  isFree: Joi.boolean().optional(),
  certificate: Joi.boolean().optional(),

  minAgeMax: Joi.number().integer().min(0).optional(), // courses where minAge <= this
  maxAgeMin: Joi.number().integer().min(0).optional(), // courses where maxAge >= this

  search: Joi.string().optional(),
  sort: Joi.string().default("-createdAt").optional(),
});

// ─── SINGLE BY ID ────────────────────────────────────────────────────────────
export const courseId = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({
      "string.pattern.base": "Invalid course ID format",
      "any.required": "Course ID is required",
    }),
});


// ─── PATCH: CHANGE STATUS ────────────────────────────────────────────────────
export const changeCourseStatus = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({ "string.pattern.base": "Invalid course ID format" }),
  status: Joi.string()
    .valid(...STATUSES)
    .required()
    .messages({ "any.only": `Status must be one of: ${STATUSES.join(", ")}` }),
});

// ─── PATCH: CHANGE ENROLLMENT STATUS ─────────────────────────────────────────
export const changeEnrollmentStatus = Joi.object({
  id: Joi.string()
    .pattern(objectIdPattern)
    .required()
    .messages({ "string.pattern.base": "Invalid course ID format" }),
  enrollmentStatus: Joi.string()
    .valid(...ENROLLMENT_STATUSES)
    .required()
    .messages({ "any.only": `Enrollment status must be one of: ${ENROLLMENT_STATUSES.join(", ")}` }),
});
