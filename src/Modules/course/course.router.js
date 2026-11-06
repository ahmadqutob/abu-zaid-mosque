import { Router } from "express";
import authorization, { optionalAuthorization } from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as courseValidation from "./course.validation.js";
import * as courseController from "./Controller/course.controller.js";
import marksRouter from "./marks/marks.router.js";
import postRouter from "./post/post.router.js";

const router = new Router();
const COURSE_STAFF_ROLES = ["superAdmin", "admin", "teacher"];

// ─── Sub-routers ──────────────────────────────────────────────────────────────
router.use("/marks", marksRouter);
router.use("/post", postRouter);
router.use("/posts", postRouter);

// ─── Public ──────────────────────────────────────────────────────────────────

// GET /course/all  — list with filters, search & pagination
router.get(
  "/all",
  optionalAuthorization(),
  validation(courseValidation.getCourses),
  courseController.getAllCourses
);

// GET /course/:id  — fetch one by MongoDB ObjectId
router.get(
  "/:id",
  optionalAuthorization(),
  validation(courseValidation.courseId),
  courseController.getCourseById
);


// get courses by teacher id
router.get(
  "/teacher/courses/:teacherId",
  authorization(["superAdmin", "admin", "teacher", "student", "user"]),
  validation(courseValidation.teacherIdParam),
  courseController.getTeacherCourses
);

// get specific course for teacher
router.get(
  "/teacher/course/:courseId",
  authorization(["superAdmin", "admin", "teacher", "student", "user"]),
  validation(courseValidation.courseIdParam),
  courseController.getTeacherCourseById
);

// ─── Protected (admin & teacher) ─────────────────────────────────────────────

// get student has course registration
router.get(
  "/students/:courseId",
  authorization(COURSE_STAFF_ROLES),
  validation(courseValidation.courseIdParam),
  courseController.getStudentsInCourse
);


 
// POST /course/create
router.post(
  "/create",
  authorization(COURSE_STAFF_ROLES),
  validation(courseValidation.createCourse),
  courseController.createCourse
);

// PUT /course/update/:id  — full / partial update
router.put(
  "/update/:id",
  authorization(COURSE_STAFF_ROLES),
  validation(courseValidation.updateCourse),
  courseController.updateCourse
);

// PATCH /course/:id/status  — change lifecycle status only
router.patch(
  "/:id/status",
  authorization(COURSE_STAFF_ROLES),
  validation(courseValidation.changeCourseStatus),
  courseController.changeCourseStatus
);

// PATCH /course/:id/enrollment-status  — change enrollment status only
router.patch(
  "/:id/enrollment-status",
  authorization(COURSE_STAFF_ROLES),
  validation(courseValidation.changeEnrollmentStatus),
  courseController.changeEnrollmentStatus
);

// DELETE /course/delete/:id  — soft delete
router.delete(
  "/delete/:id",
  authorization(COURSE_STAFF_ROLES),
  validation(courseValidation.courseId),
  courseController.deleteCourse
);

// PATCH /course/restore/:id  — restore soft-deleted course
router.patch(
  "/restore/:id",
  authorization(COURSE_STAFF_ROLES),
  validation(courseValidation.courseId),
  courseController.restoreCourse
);

export default router;

