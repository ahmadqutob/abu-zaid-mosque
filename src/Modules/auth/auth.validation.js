import joi from "joi";
import { geniralFeild } from "../../Services/geniralFeild.validation.js";


// Public self-signup: visitor always becomes a "user".
// Student role is granted later (via course enrollment / admin action).
// Teacher and admin can only be created by an admin.
export const signup = joi.object({
    userName: geniralFeild.userName,
    email: geniralFeild.email,
    password: geniralFeild.password,
    phone: geniralFeild.phone,
    gender: geniralFeild.gender,
});

// Admin-only: create any role on behalf of someone else.
export const adminCreateUser = joi.object({
    userName: geniralFeild.userName,
    email: geniralFeild.email,
    password: geniralFeild.password,
    phone: geniralFeild.phone,
    gender: geniralFeild.gender,
    role: geniralFeild.role.required(),
});

// Admin: list users with optional filters and pagination
export const adminListUsers = joi.object({
    page: joi.number().integer().min(1).optional(),
    limit: joi.number().integer().min(1).max(100).optional(),
    role: geniralFeild.role.optional(),
    search: joi.string().min(1).max(100).optional(),
    sort: joi.string().valid("createdAt", "-createdAt", "userName", "-userName").optional(),
});

// Admin: update a user (any subset of fields, role can be changed)
export const adminUpdateUser = joi.object({
    id: joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    userName: joi.string().alphanum().max(20).optional(),
    email: joi.string().email({ minDomainSegments: 2, tlds: { allow: ["com", "net", "ps"] } }).optional(),
    phone: joi.string().pattern(/^[+]?[\d\s\-\(\)]{8,15}$/).optional(),
    gender: joi.string().valid("male", "female").optional(),
    role: geniralFeild.role.optional(),
    confirmEmail: joi.boolean().optional(),
});

// Admin: get / delete a user by id
export const adminUserIdParam = joi.object({
    id: joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});


export const token = joi
  .object({
    token: geniralFeild.token
  })
  .required();

  export const checkConfirmEmail = joi
  .object({
    email: geniralFeild.email
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
    code: joi.string().required(),
  })
  .required();

  export const changePassword = joi
  .object({
     oldPassword: geniralFeild.password,
    newPassword: geniralFeild.password,
    CnewPassword: geniralFeild.password.valid(joi.ref("newPassword")),
  })
  .required();
  