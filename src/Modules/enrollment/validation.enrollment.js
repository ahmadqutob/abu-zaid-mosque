// enrollment.validation.js
import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const courseIdParam = Joi.object({
  courseId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid course ID format",
    "any.required": "Course ID is required",
  }),
});
 
export const evaluateRegistration = Joi.object({
  registrationId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid registration ID format",
    "any.required": "Registration ID is required",
  }),
  decision: Joi.string().valid("approved", "rejected").required().messages({
    "any.only": "Decision must be either approved or rejected",
    "any.required": "Decision is required",
  }),
  note: Joi.string().max(300).optional().messages({
    "string.max": "Note cannot exceed 300 characters",
  }),
});
