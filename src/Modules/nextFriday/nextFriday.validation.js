import Joi from "joi";

// Validation schema for creating nextFriday
export const createNextFriday = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),
  
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

  date: Joi.date()
    .required()
    .messages({
      'date.base': 'Invalid date format',
      'any.required': 'Date is required'
    }),

  // Files injected by validation middleware from multer (image)
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
    .min(1)
    .max(1)
    .required()
    .messages({
      'any.required': 'Image is required',
      'array.min': 'Image is required',
      'array.max': 'Only one image is allowed',
      'string.pattern.base': 'File must be an image file'
    }),
});

// Validation schema for updating nextFriday
export const updateNextFriday = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Title must be at least 3 characters long',
      'string.max': 'Title cannot exceed 100 characters'
    }),
  
  name: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Name must be at least 3 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),

  date: Joi.date()
    .optional()
    .messages({
      'date.base': 'Invalid date format'
    }),

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

// Validation schema for nextFriday ID parameter
export const nextFridayId = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required'
    })
});
