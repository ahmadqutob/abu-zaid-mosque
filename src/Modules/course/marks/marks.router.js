import { Router } from "express";
import authorization from "../../../Middleware/authorization.middleware.js";
import validation from "../../../Middleware/validation.middleware.js";
import * as marksValidation from "./marks.validation.js";
import * as marksController from "./controller/marks.controller.js";

const router = Router({ mergeParams: true });
const MARK_READ_ROLES = ["superAdmin", "admin", "teacher", "student"];
const MARK_STAFF_ROLES = ["superAdmin", "admin", "teacher"];

// ─── Protected Read Routes (admin, teacher, student, user) ───────────────────

// GET /all - list with filters, pagination, search
router.get(
  "/all",
  authorization(MARK_READ_ROLES),
  validation(marksValidation.getMarks),
  marksController.getAllMarks
);

// GET /course/:courseId - get marks for a specific course
router.get(
  "/course/:courseId",
  authorization(MARK_READ_ROLES),
  validation(marksValidation.getMarksByCourse),
  marksController.getMarksByCourse
);

// GET /student/:studentId - get marks for a specific student
router.get(
  "/student/:studentId",
  authorization(MARK_READ_ROLES),
  validation(marksValidation.studentIdParam),
  marksController.getMarksByStudent
);

// GET /:id - fetch single mark details
router.get(
  "/:id",
  authorization(MARK_READ_ROLES),
  validation(marksValidation.markId),
  marksController.getMarkById
);

// ─── Protected Write Routes (admin, teacher) ─────────────────────────────────

// POST /create - record new mark
router.post(
  "/create",
  authorization(MARK_STAFF_ROLES),
  validation(marksValidation.createMark),
  marksController.createMark
);

// PUT /update/:id - update existing mark
router.put(
  "/update/:id",
  authorization(MARK_STAFF_ROLES),
  validation(marksValidation.updateMark),
  marksController.updateMark
);

// DELETE /delete/:id - soft delete mark
router.delete(
  "/delete/:id",
  authorization(MARK_STAFF_ROLES),
  validation(marksValidation.markId),
  marksController.deleteMark
);

export default router;
