import { Router } from "express";
import * as authController from './controller/auth.controller.js'
import authorization from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as validationSchema from './auth.validation.js'
const router = new Router();

const ALL_ROLES = ["admin", "teacher", "student", "user"];

router.post("/signin", validation(validationSchema.signin), authController.signin);
router.post("/signup", validation(validationSchema.signup), authController.signup);


router.get("/confirmEmail/:token", validation(validationSchema.token), authController.confairmEmails);
router.get("/checkConfirmEmail/:email", validation(validationSchema.checkConfirmEmail), authController.checkConfirmEmail);

// Forget / reset password
router.post("/forgotPassword", validation(validationSchema.forgotPassword), authController.forgotPassword);
router.post("/sendCode", validation(validationSchema.sendCode), authController.sendCode);

// Any authenticated role
router.get("/me", authorization(ALL_ROLES), authController.me);
router.post("/logout", authorization(ALL_ROLES), authController.logout);
router.patch(
  "/changePassword",
  authorization(ALL_ROLES),
  validation(validationSchema.changePassword),
  authController.changePassword
);

// Admin-only user management (CRUD)
router.post(
  "/admin/users",
  authorization(["admin"]),
  validation(validationSchema.adminCreateUser),
  authController.adminCreateUser
);

router.post(
  "/admin/teachers",
  authorization(["admin"]),
  validation(validationSchema.adminCreateUser),
  authController.adminCreateTeacher
);
router.get(
  "/admin/users",
  authorization(["admin"]),
  validation(validationSchema.adminListUsers),
  authController.adminListUsers
);
router.get(
  "/admin/users/:id",
  authorization(["admin"]),
  validation(validationSchema.adminUserIdParam),
  authController.adminGetUser
);
router.put(
  "/admin/users/:id",
  authorization(["admin"]),
  validation(validationSchema.adminUpdateUser),
  authController.adminUpdateUser
);
router.delete(
  "/admin/users/:id",
  authorization(["admin"]),
  validation(validationSchema.adminUserIdParam),
  authController.adminDeleteUser
);

export default router
