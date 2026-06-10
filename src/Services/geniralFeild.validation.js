import joi from 'joi';

export const geniralFeild = {

    userName: joi.string()
    .alphanum()
    .required()
    .max(20)
    .messages({
      "any.required": "Username is required",
      "string.empty": "Username cannot be empty",
      "string.alphanum": "Username must only contain letters and numbers",
      "string.max": "Username must be at most 20 characters long",
    }),

    email:joi.string().email({minDomainSegments:2,tlds:{allow:['com','net','ps']}}).required().messages(
      {
        "any.required": "Email is required",
        "string.empty": "Email cannot be empty",
        "string.email": "Please provide a valid email address with a .com, .net, or .ps domain",
      }
    ),
   
    password: joi.string()
    .min(8)
    .max(64)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).+$/)
    .required()
    .messages({
      "any.required": "password is required",
      "string.empty": "password cannot be empty",
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password cannot exceed 64 characters",
      "string.pattern.base": "Password must include upper, lower, number and a symbol",
    }),

  phone: joi.string()
    .pattern(/^[+]?[\d\s\-\(\)]{8,15}$/)
    .required()
    .messages({
      "any.required": "Phone number is required",
      "string.empty": "Phone number cannot be empty",
      "string.pattern.base": "Please provide a valid phone number",
    }),

  // All roles known to the system. Public signup is limited to user|student
  // (enforced in auth.validation.js). Admin endpoints can use any role.
  role: joi.string()
    .valid("admin", "teacher", "student", "user")
    .messages({
      "any.only": "Role must be one of: admin, teacher, student, user",
    }),

  gender: joi.string()
    .required()
    .valid("male", "female")
    .messages({
      "any.required": "Gender is required",
      "any.only": "Gender must be either 'male' or 'female'",
      "string.empty": "Gender cannot be empty",
    }),


 
    token: joi.string().required(),
   
   
} 
 
 
 