import joi from "joi";
import { geniralFeild } from "../../Services/geniralFeild.validation.js";


// Public self-signup: visitor always becomes a "user".
export const signup = joi.object({
    userName: geniralFeild.userName,
    email: geniralFeild.email,
    password: geniralFeild.password,
    phone: geniralFeild.phone,
    gender: geniralFeild.gender,
});

export const adminListTeachers = joi.object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).max(100).optional(),
    search: joi.string().min(1).max(100).optional(),
}).required();

// Admin: list users with optional filters and pagination
export const adminListUsers = joi.object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).max(100).optional(),
    role: geniralFeild.role.optional(),
    search: joi.string().min(1).max(100).optional(),
    sort: joi.string().valid("createdAt", "-createdAt", "userName", "-userName").optional(),
});

// Admin: update profile fields without changing account roles.
export const adminUpdateUser = joi.object({
    id: joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    userName: joi.string().alphanum().max(20).optional(),
    email: joi.string().email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "ps"] } }).optional(),
    phone: joi.string().pattern(/^[+]?[\d\s\-\(\)]{8,15}$/).optional(),
    gender: joi.string().valid("male", "female").optional(),
    confirmEmail: joi.boolean().optional(),
});

// Admin: get / delete a user by id
export const adminUserIdParam = joi.object({
    id: joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

export const adminTeacherIdParam = joi.object({
    id: joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});


export const token = joi
  .object({
    token: geniralFeild.token
  })
  .required();



  export const signin = joi.object({
    email: geniralFeild.email,
    password: geniralFeild.password,
  })
  .required();

  export const sendCode = joi.object({
    email: geniralFeild.email,
  })
  .required();


  export const forgotPassword = joi
  .object({
    email: geniralFeild.email,
    NEWpassword: geniralFeild.password,
    Cpassword: geniralFeild.password.valid(joi.ref("NEWpassword")),
    code: joi.string().pattern(/^\d{8}$/).required(),
  })
  .required();

  export const changePassword = joi
  .object({
     oldPassword: geniralFeild.password,
    newPassword: geniralFeild.password,
    CnewPassword: geniralFeild.password.valid(joi.ref("newPassword")),
  })
  .required();

  export const adminResetPassword = joi.object({
    id: joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    newPassword: geniralFeild.password,
    CnewPassword: geniralFeild.password.valid(joi.ref("newPassword")),
  }).required();
