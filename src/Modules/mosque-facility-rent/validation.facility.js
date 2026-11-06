import Joi from "joi";

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const STATUSES = ["pending", "approved", "rejected", "cancelled", "completed"];

export const facilityIdParam = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid facility rent ID format",
    "any.required": "Facility rent ID is required",
  }),
});

export const createFacilityRent = Joi.object({
  renterName: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Renter name is required",
    "any.required": "Renter name is required",
  }),
  renterPhone: Joi.string().required().messages({
    "string.empty": "Renter phone number is required",
    "any.required": "Renter phone number is required",
  }),
  eventType: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Event type is required",
    "any.required": "Event type is required",
  }),
  startDate: Joi.date().required().messages({
    "date.base": "Start date must be a valid date",
    "any.required": "Start date is required",
  }),
  endDate: Joi.date().greater(Joi.ref("startDate")).required().messages({
    "date.base": "End date must be a valid date",
    "date.greater": "End date must be after start date",
    "any.required": "End date is required",
  }),
});

export const updateFacilityRent = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid facility rent ID format",
  }),
  renterName: Joi.string().min(3).max(100).optional(),
  renterPhone: Joi.string().optional(),
  eventType: Joi.string().min(2).max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  extraCharge: Joi.number().min(0).optional(),
  paid: Joi.boolean().optional(),
}).custom((value, helpers) => {
  if (
    value.startDate !== undefined &&
    value.endDate !== undefined &&
    value.endDate <= value.startDate
  ) {
    return helpers.error("date.range");
  }
  return value;
}).messages({ "date.range": "End date must be after start date" });

export const changeStatus = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid facility rent ID format",
  }),
  status: Joi.string().valid(...STATUSES).required().messages({
    "any.only": `Status must be one of: ${STATUSES.join(", ")}`,
    "any.required": "Status is required",
  }),
  reviewerNote: Joi.string().max(500).allow("", null).optional(),
});

export const checkAvailability = Joi.object({
  startDate: Joi.date().required().messages({
    "date.base": "Start date must be a valid date",
    "any.required": "Start date is required",
  }),
  endDate: Joi.date().greater(Joi.ref("startDate")).required().messages({
    "date.base": "End date must be a valid date",
    "date.greater": "End date must be after start date",
    "any.required": "End date is required",
  }),
});

export const getFacilityRents = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  status: Joi.string().valid(...STATUSES).optional(),
  facilityId: Joi.string().pattern(objectIdPattern).optional(),
  search: Joi.string().optional(),
  sort: Joi.string().default("-createdAt").optional(),
});
