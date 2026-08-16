import Joi from "joi";

const CATEGORIES = [
  "announcement",
  "lecture",
  "quran_competition",
  "friday_sermon",
  "event",
  "charity",
  "prayer_schedule",
  "general"
];

// Validation schema for creating a mosque post
export const createPost = Joi.object({
  title: Joi.string()
    .min(5)
    .max(150)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 150 characters',
      'any.required': 'Title is required'
    }),
  
  content: Joi.string()
    .min(10)
    .max(10000)
    .required()
    .messages({
      'string.empty': 'Content is required',
      'string.min': 'Content must be at least 10 characters long',
      'string.max': 'Content cannot exceed 10000 characters',
      'any.required': 'Content is required'
    }),
  
  

  category: Joi.string()
    .valid(...CATEGORIES)
    .default('general')
    .optional()
    .messages({
      'any.only': `Category must be one of: ${CATEGORIES.join(', ')}`
    }),

  slug: Joi.string()
    .optional()
    .allow('', null),
  isPinned: Joi.boolean()
    .default(false)
    .optional(),
  published: Joi.boolean()
    .default(true)
    .optional(),

  // Files injected by validation middleware from multer
  mainImage: Joi.array()
    .items(Joi.object({
      fieldname: Joi.string().valid('mainImage').required(),
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
      'any.required': 'Main image is required',
      'array.min': 'Main image is required',
      'array.max': 'Only one main image is allowed',
      'string.pattern.base': 'Main image must be an image file'
    }),

  subImage: Joi.array()
    .items(Joi.object({
      fieldname: Joi.string().valid('subImage').required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().optional(),
      mimetype: Joi.string().pattern(/^image\//).required(),
      destination: Joi.string().optional(),
      filename: Joi.string().optional(),
      path: Joi.string().required(),
      size: Joi.number().min(1).required()
    }))
    .max(5)
    .optional()
    .messages({
      'array.max': 'You can upload up to 5 sub images',
      'string.pattern.base': 'Sub images must be image files'
    }),
});

// Validation schema for updating a mosque post
export const updatePost = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),

  title: Joi.string()
    .min(5)
    .max(150)
    .optional()
    .messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 150 characters'
    }),
  
  content: Joi.string()
    .min(10)
    .max(10000)
    .optional()
    .messages({
      'string.min': 'Content must be at least 10 characters long',
      'string.max': 'Content cannot exceed 10000 characters'
    }),

  category: Joi.string()
    .valid(...CATEGORIES)
    .optional()
    .messages({
      'any.only': `Category must be one of: ${CATEGORIES.join(', ')}`
    }),
  
  isPinned: Joi.boolean().optional(),
  published: Joi.boolean().optional(),
});

// Validation schema for getting posts with filters
export const getPosts = Joi.object({
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(10).optional(),
  category: Joi.string().valid(...CATEGORIES).optional(),
  isPinned: Joi.boolean().optional(),
  published: Joi.boolean().default(true).optional(),
  author: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
 
});

// Validation schema for getting posts by category
export const getPostsByCategory = Joi.object({
  category: Joi.string()
    .valid(...CATEGORIES)
    .required()
    .messages({
      'any.required': 'Category is required',
      'any.only': `Category must be one of: ${CATEGORIES.join(', ')}`
    }),
  page: Joi.number().integer().min(1).default(1).optional(),
  limit: Joi.number().integer().min(1).max(50).default(10).optional(),
  sort: Joi.string().default('-createdAt').optional(),
});

// Validation schema for post ID parameter
export const postId = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid post ID format',
      'any.required': 'Post ID is required'
    })
});

 

  