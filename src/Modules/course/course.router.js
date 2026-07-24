import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as courseValidation from "./course.validation.js";
import * as courseController from "./Controller/course.controller.js";

const router = new Router();

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /course/all  — list with filters, search & pagination
router.get(
  "/all",
  validation(courseValidation.getCourses),
  courseController.getAllCourses
);

// GET /course/:id  — fetch one by MongoDB ObjectId
router.get(
  "/:id",
  validation(courseValidation.courseId),
  courseController.getCourseById
);

// ─── Protected (admin & teacher) ─────────────────────────────────────────────

// POST /course/create
router.post(
  "/create",
  authorization(["admin", "teacher"]),
  validation(courseValidation.createCourse),
  courseController.createCourse
);

// PUT /course/update/:id  — full / partial update
router.put(
  "/update/:id",
  authorization(["admin", "teacher"]),
  validation(courseValidation.updateCourse),
  courseController.updateCourse
);

// PATCH /course/:id/status  — change lifecycle status only
router.patch(
  "/:id/status",
  authorization(["admin", "teacher"]),
  validation(courseValidation.changeCourseStatus),
  courseController.changeCourseStatus
);

// PATCH /course/:id/enrollment-status  — change enrollment status only
router.patch(
  "/:id/enrollment-status",
  authorization(["admin", "teacher"]),
  validation(courseValidation.changeEnrollmentStatus),
  courseController.changeEnrollmentStatus
);

// DELETE /course/delete/:id  — soft delete
router.delete(
  "/delete/:id",
  authorization(["admin", "teacher"]),
  validation(courseValidation.courseId),
  courseController.deleteCourse
);

export default router;
