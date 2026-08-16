import { Router } from "express";
import authorization from "../../../Middleware/authorization.middleware.js";
import validation from "../../../Middleware/validation.middleware.js";
import * as marksValidation from "./marks.validation.js";
import * as marksController from "./controller/marks.controller.js";

const router = Router({ mergeParams: true });

// ─── Protected Read Routes (admin, teacher, student, user) ───────────────────

// GET /all - list with filters, pagination, search
router.get(
  "/all",
  authorization(["admin", "teacher", "student", "user"]),
  validation(marksValidation.getMarks),
  marksController.getAllMarks
);

// GET /course/:courseId - get marks for a specific course
router.get(
  "/course/:courseId",
  authorization(["admin", "teacher", "student", "user"]),
  validation(marksValidation.courseIdParam),
  marksController.getMarksByCourse
);

// GET /student/:studentId - get marks for a specific student
router.get(
  "/student/:studentId",
  authorization(["admin", "teacher", "student", "user"]),
  validation(marksValidation.studentIdParam),
  marksController.getMarksByStudent
);

// GET /:id - fetch single mark details
router.get(
  "/:id",
  authorization(["admin", "teacher", "student", "user"]),
  validation(marksValidation.markId),
  marksController.getMarkById
);

// ─── Protected Write Routes (admin, teacher) ─────────────────────────────────

// POST /create - record new mark
router.post(
  "/create",
  authorization(["admin", "teacher"]),
  validation(marksValidation.createMark),
  marksController.createMark
);

// PUT /update/:id - update existing mark
router.put(
  "/update/:id",
  authorization(["admin", "teacher"]),
  validation(marksValidation.updateMark),
  marksController.updateMark
);

// DELETE /delete/:id - soft delete mark
router.delete(
  "/delete/:id",
  authorization(["admin", "teacher"]),
  validation(marksValidation.markId),
  marksController.deleteMark
);

export default router;
