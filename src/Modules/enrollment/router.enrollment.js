// enrollment.router.js
import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as enrollmentValidation from "./validation.enrollment.js";
import * as enrollmentController from "./controller/controller.enrollment.js";

const router = new Router();

const APPLICANT_ROLES = ["user", "student"];
const ADMIN_TEACHER_ROLES = ["admin", "teacher"];

// ── Student / User ───────────────────────────────────────────
router.post(
  "/apply/:courseId",
  authorization(["student"]),
  validation(enrollmentValidation.courseIdParam),
  enrollmentController.applyToCourse
);

router.get(
  "/me",
  authorization(["student"]),
  enrollmentController.getMyRegistrations
);

router.patch(
  "/cancel/:registrationId",
  authorization(["student"]),
  validation(enrollmentValidation.registrationIdParam),
  enrollmentController.cancelRegistration
);

// ── Teacher & Admin ──────────────────────────────────────────
router.get(
  "/course/:courseId",
  authorization(["admin", "teacher"]),
  validation(enrollmentValidation.courseIdParam),
  enrollmentController.getCourseRegistrations
);

router.patch(
  "/evaluate/:registrationId",
  authorization(["admin", "teacher"]),
  validation(enrollmentValidation.evaluateRegistration),
  enrollmentController.evaluateRegistration
);

export default router;
