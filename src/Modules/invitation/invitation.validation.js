import joi from "joi";
import { geniralFeild } from "../../Services/geniralFeild.validation.js";

export const adminInvite = joi.object({
  email: geniralFeild.email,
  role: joi.string().valid("teacher", "admin", "superAdmin").required(),
}).required();

export const teacherInvite = joi.object({
  email: geniralFeild.email,
}).required();

export const acceptInvitation = joi.object({
  token: joi.string().hex().length(64).required(),
}).required();
