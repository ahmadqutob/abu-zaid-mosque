import { Router } from "express";
import * as authController from './controller/auth.controller.js'
import authorization, { ROLES_ALL } from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as validationSchema from './auth.validation.js'
import { createRateLimiter } from "../../Services/securityStore.services.js";
const router = new Router();

const ADMIN_ROLES = ["admin", "superAdmin"];

const loginLimiter = createRateLimiter("login", 15 * 60 * 1000, 10);
const signupLimiter = createRateLimiter("signup", 60 * 60 * 1000, 5);
const sensitiveActionLimiter = createRateLimiter("sensitive", 15 * 60 * 1000, 5);
const resetCodeRequestLimiter = createRateLimiter("reset-code", 15 * 60 * 1000, 3);

router.post("/signin", loginLimiter, validation(validationSchema.signin), authController.signin);
router.post("/signup", signupLimiter, validation(validationSchema.signup), authController.signup);
router.get("/confirmEmail/:token", sensitiveActionLimiter, validation(validationSchema.token), authController.confairmEmails);



// Forget / reset password
router.post("/sendCode", resetCodeRequestLimiter, sensitiveActionLimiter, validation(validationSchema.sendCode), authController.sendCode);
router.post("/forgotPassword", sensitiveActionLimiter, validation(validationSchema.forgotPassword), authController.forgotPassword);

// Any authenticated role
router.get("/me", authorization(ROLES_ALL), authController.me);
router.post("/logout", authorization(ROLES_ALL), authController.logout);
router.patch(
  "/changePassword",
  authorization(ROLES_ALL),
  validation(validationSchema.changePassword),
  authController.changePassword
);

// User management routes for admins
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
