import Joi from "joi";

// Validation schema for creating a post
export const createPost = Joi.object({
  title: Joi.string()
    .min(5)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),
  
  content: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.empty': 'Content is required',
      'string.min': 'Content must be at least 50 characters long',
      'string.max': 'Content cannot exceed 5000 characters',
      'any.required': 'Content is required'
    }),
  
  excerpt: Joi.string()// //A short summary or preview of the post
    .max(200)
    .optional()
    .messages({
      'string.empty': 'Excerpt is required',
      'string.max': 'Excerpt cannot exceed 200 characters',
      'any.required': 'Excerpt is required'
    }),
  slug: Joi.string()
    .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional()
    .messages({
      'string.pattern.base': 'Slug may contain lowercase letters, numbers and dashes only'
    }),
 
  tags: Joi.array()
    .items(
      Joi.string()
        .min(1)
        .max(20)
        .trim()
        .messages({
          'string.min': 'Each tag must be at least 1 characters long',
          'string.max': 'Each tag cannot exceed 20 characters'
        })
    )
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags'
    }),
  
  featured: Joi.boolean()
    .default(false)
    .optional(),
  
  published: Joi.boolean()
    .default(false)
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

// Validation schema for updating a post
export const updatePost = Joi.object({
  title: Joi.string()
    .min(5)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 100 characters'
    }),
  
  content: Joi.string()
    .min(50)
    .max(5000)
    .optional()
    .messages({
      'string.min': 'Content must be at least 50 characters long',
      'string.max': 'Content cannot exceed 5000 characters'
    }),
  
  excerpt: Joi.string()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Excerpt cannot exceed 200 characters'
    }),
  
 
  
  tags: Joi.array()
    .items(
      Joi.string()
        .min(2)
        .max(20)
        .trim()
        .messages({
          'string.min': 'Each tag must be at least 2 characters long',
          'string.max': 'Each tag cannot exceed 20 characters'
        })
    )
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags'
    }),
  
  featured: Joi.boolean()
    .optional(),
  
  published: Joi.boolean()
    .optional(),
});

// Validation schema for getting posts with filters
export const getPosts = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .optional(),
 
  featured: Joi.boolean()
    .optional(),
  
  published: Joi.boolean()
    .default(true)
    .optional(),
  
  author: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid author ID format'
    }),
  
  search: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search term must be at least 2 characters long',
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  
  sort: Joi.string()
    .valid('-createdAt', 'createdAt', '-publishedAt', 'publishedAt', '-views', 'views', '-likesCount', 'likesCount')
    .default('-createdAt')
    .optional(),
});

// Validation schema for getting posts by tag
export const getPostsByTag = Joi.object({
  tag: Joi.string()
    .min(1)
    .max(20)
    .trim()
    .required()
    .messages({
      'string.empty': 'Tag is required',
      'string.min': 'Tag must be at least 1 character long',
      'string.max': 'Tag cannot exceed 20 characters',
      'any.required': 'Tag is required'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .optional(),
  
  featured: Joi.boolean()
    .optional(),
  
  published: Joi.boolean()
    .default(true)
    .optional(),
  
  author: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid author ID format'
    }),
  
  sort: Joi.string()
    .valid('-createdAt', 'createdAt', '-publishedAt', 'publishedAt', '-views', 'views', '-likesCount', 'likesCount')
    .default('-createdAt')
    .optional(),
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
