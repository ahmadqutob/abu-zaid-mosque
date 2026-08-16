import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import fileUpload, { fileValidation, HME } from "../../Middleware/multer.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as teacherValidation from "./teacher.validation.js";
import * as teacherController from "./controller/teacher.controller.js";

const router = Router();

// ─── Public Routes ───────────────────────────────────────────────────────────

// GET /all - List all teachers (with search, pagination, courses taught)
router.get(
  "/all",
  validation(teacherValidation.getTeachers),
  teacherController.getAllTeachers
);

// GET /me - Get logged-in teacher profile
router.get(
  "/me",
  authorization(["admin", "teacher"]),
  teacherController.getMyTeacherProfile
);

// GET /:id - Get teacher details by Teacher ID or User ID
router.get(
  "/:id",
  validation(teacherValidation.teacherIdParam),
  teacherController.getTeacherById
);

// ─── Protected Routes (Admin & Teacher) ──────────────────────────────────────

// POST /create - Create a new teacher profile (admin & superAdmin)
router.post(
  "/create",
  authorization(["admin", "superAdmin"]),
  fileUpload(fileValidation.image).fields([{ name: "image", maxCount: 1 }]),
  HME,
  validation(teacherValidation.createTeacherProfile),
  teacherController.createTeacherProfile
);

// PUT /update/:id - Update teacher profile details (admin, or teacher for self)
router.put(
  "/update/:id",
  authorization(["admin", "teacher"]),
  fileUpload(fileValidation.image).fields([{ name: "image", maxCount: 1 }]),
  HME,
  validation(teacherValidation.updateTeacherProfile),
  teacherController.updateTeacher
);

// DELETE /delete/:id - Soft delete teacher profile (admin & superAdmin)
router.delete(
  "/delete/:id",
  authorization(["admin", "superAdmin"]),
  validation(teacherValidation.teacherIdParam),
  teacherController.deleteTeacher
);

export default router;
