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
  facilityId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid facility ID format",
    "any.required": "Facility ID is required",
  }),
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
  totalPrice: Joi.number().min(0).required().messages({
    "number.min": "Total price cannot be negative",
    "any.required": "Total price is required",
  }),
  extraCharge: Joi.number().min(0).default(0).optional(),
});

export const updateFacilityRent = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid facility rent ID format",
  }),
  facilityId: Joi.string().pattern(objectIdPattern).optional(),
  renterName: Joi.string().min(3).max(100).optional(),
  renterPhone: Joi.string().optional(),
  eventType: Joi.string().min(2).max(100).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional().when("startDate", {
    is: Joi.date().exist(),
    then: Joi.date().greater(Joi.ref("startDate")),
  }),
  totalPrice: Joi.number().min(0).optional(),
  extraCharge: Joi.number().min(0).optional(),
  paid: Joi.boolean().optional(),
});

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
  facilityId: Joi.string().pattern(objectIdPattern).required().messages({
    "string.pattern.base": "Invalid facility ID format",
    "any.required": "Facility ID is required",
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

export const getFacilityRents = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(100).default(10).optional(),
  status: Joi.string().valid(...STATUSES).optional(),
  facilityId: Joi.string().pattern(objectIdPattern).optional(),
  search: Joi.string().optional(),
  sort: Joi.string().default("-createdAt").optional(),
});
