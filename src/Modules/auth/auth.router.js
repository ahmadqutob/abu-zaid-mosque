import { Router } from "express";
import * as authController from './controller/auth.controller.js'
import authorization from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as validationSchema from './auth.validation.js'
import rateLimit from 'express-rate-limit';
const router = new Router();

const ALL_ROLES = ["admin", "teacher", "student", "user"];
const ADMIN_ROLES = ["admin", "superAdmin"];

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const sensitiveActionLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

router.post("/signin", loginLimiter, validation(validationSchema.signin), authController.signin);
router.post("/signup",  validation(validationSchema.signup), authController.signup);


router.get("/confirmEmail/:token", sensitiveActionLimiter, validation(validationSchema.token), authController.confairmEmails);

// Forget / reset password
router.post("/forgotPassword", sensitiveActionLimiter,validation(validationSchema.forgotPassword), authController.forgotPassword);
router.post("/sendCode", sensitiveActionLimiter, validation(validationSchema.sendCode), authController.sendCode);

// Any authenticated role
router.get("/me", authorization(ALL_ROLES), authController.me);
router.post("/logout", authorization(ALL_ROLES), authController.logout);
router.patch(
  "/changePassword",
  authorization(ALL_ROLES),
  validation(validationSchema.changePassword),
  authController.changePassword
);

// user management routes for admin
// Admin-only user management (CRUD)
router.post(
  "/admin/users",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminCreateUser),
  authController.adminCreateUser
);

router.get(
  "/admin/users",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminListUsers),
  authController.adminListUsers
);

router.get(
  "/admin/users/:id",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminUserIdParam),
  authController.adminGetUser
);

router.put(
  "/admin/users/:id",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminUpdateUser),
  authController.adminUpdateUser
);
router.delete(
  "/admin/users/:id",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminUserIdParam),
  authController.adminDeleteUser
);

// Teacher management routes

router.post(
  "/admin/teachers",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminCreateTeacher),
  authController.adminCreateTeacher
);
router.get(
  "/admin/teachers",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminListTeachers),
  authController.adminListTeachers
);
router.get(
  "/admin/teachers/:id",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminTeacherIdParam),
  authController.adminGetTeacher
);

router.delete(
  "/admin/teachers/:id",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminTeacherIdParam),
  authController.adminDeleteTeacher
);

// Admin-only: reset password for student or teacher
router.post(
  "/admin/reset-password",
  authorization(ADMIN_ROLES),
  validation(validationSchema.adminResetPassword),
  authController.adminResetPassword
);

// Audit logs - view deletion history
router.get(
  "/admin/audit-logs",
  authorization(ADMIN_ROLES),
  authController.getAuditLogs
);

export default router
