import Joi from "joi";

// Validation schema for creating an event
export const createEvent = Joi.object({
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

  startDate: Joi.date()
    .required()
    .messages({
      'date.base': 'Invalid start date format',
      'any.required': 'Start date is required'
    }),

  endDate: Joi.date()
    .required()
    .min(Joi.ref('startDate'))
    .messages({
      'date.base': 'Invalid end date format',
      'date.min': 'End date must be equal to or after start date',
      'any.required': 'End date is required'
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

  category: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Category is required',
      'string.min': 'Category must be at least 2 characters long',
      'string.max': 'Category cannot exceed 50 characters',
      'any.required': 'Category is required'
    }),

  status: Joi.string()
    .valid('upcoming', 'ongoing', 'completed', 'cancelled')
    .optional()
    .default('upcoming')
    .messages({
      'any.only': 'Status must be one of: upcoming, ongoing, completed, cancelled'
    }),

  age: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Age range/target is required',
      'any.required': 'Age range/target is required'
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

// Validation schema for updating an event
export const updateEvent = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .optional(),

  description: Joi.string()
    .min(10)
    .max(2000)
    .optional(),

  startDate: Joi.date()
    .optional(),

  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.min': 'End date must be equal to or after start date'
    }),

  location: Joi.string()
    .min(3)
    .max(200)
    .optional(),

  category: Joi.string()
    .min(2)
    .max(50)
    .optional(),

  status: Joi.string()
    .valid('upcoming', 'ongoing', 'completed', 'cancelled')
    .optional(),

  age: Joi.string()
    .min(1)
    .max(50)
    .optional(),

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

// Validation schema for event ID parameter
export const eventId = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid ID format',
      'any.required': 'ID is required'
    })
});
