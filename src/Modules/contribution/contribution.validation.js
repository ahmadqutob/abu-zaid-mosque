import Joi from "joi";

// Validation schema for creating a contribution
export const createContribution = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 3 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  description: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 2000 characters',
      'any.required': 'Description is required'
    }),

  condition: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Condition is required',
      'string.min': 'Condition must be at least 3 characters long',
      'string.max': 'Condition cannot exceed 100 characters',
      'any.required': 'Condition is required'
    }),

  quantity: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity must be at least 1',
      'any.required': 'Quantity is required'
    }),

  location: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Location is required',
      'string.min': 'Location must be at least 3 characters long',
      'string.max': 'Location cannot exceed 200 characters',
      'any.required': 'Location is required'
    }),

  notes: Joi.string()
    .max(1000)
    .optional()
    .allow(''),

  // Optional image field validation
  image: Joi.array()
    .items(Joi.object({
      fieldname: Joi.string().valid('image').required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().optional(),
      mimetype: Joi.string().pattern(/^image\//).required(),
      destination: Joi.string().optional(),
      filename: Joi.string().optional(),
      path: Joi.string().required(),
      size: Joi.number().min(1).required()
    }))
    .max(1)
    .optional()
    .messages({
      'array.max': 'Only one image is allowed',
      'string.pattern.base': 'File must be an image file'
    }),
});

// Validation schema for updating a contribution
export const updateContribution = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .optional(),

  description: Joi.string()
    .min(10)
    .max(2000)
    .optional(),

  condition: Joi.string()
    .min(3)
    .max(100)
    .optional(),

  quantity: Joi.number()
    .integer()
    .min(1)
    .optional(),

  location: Joi.string()
    .min(3)
    .max(200)
    .optional(),

  notes: Joi.string()
    .max(1000)
    .optional()
    .allow(''),

  image: Joi.array()
    .items(Joi.object({
      fieldname: Joi.string().valid('image').required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().optional(),
      mimetype: Joi.string().pattern(/^image\//).required(),
      destination: Joi.string().optional(),
      filename: Joi.string().optional(),
      path: Joi.string().required(),
      size: Joi.number().min(1).required()
    }))
    .max(1)
    .optional()
    .messages({
      'array.max': 'Only one image is allowed',
      'string.pattern.base': 'File must be an image file'
    }),
});

// Validation schema for contribution ID parameter
export const contributionId = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required'
    })
});
