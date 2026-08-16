import { Router } from "express";
import authorization from "../../../Middleware/authorization.middleware.js";
import validation from "../../../Middleware/validation.middleware.js";
import * as postValidation from "./post.validation.js";
import * as postController from "./controller/post.controller.js";

const router = Router({ mergeParams: true });

// ─── Read Routes ─────────────────────────────────────────────────────────────

// GET /all - List all posts with filters, search, and pagination
router.get(
  "/all",
  authorization(["admin", "teacher", "student", "user"]),
  validation(postValidation.getCoursePosts),
  postController.getCoursePosts
);

// GET /course/:courseId - Get all posts for a specific course
router.get(
  "/course/:courseId",
  authorization(["admin", "teacher", "student", "user"]),
  validation(postValidation.courseIdParam),
  postController.getPostsByCourseId
);

// GET /:id - Get single post by ID
router.get(
  "/:id",
  authorization(["admin", "teacher", "student", "user"]),
  validation(postValidation.postIdParam),
  postController.getCoursePostById
);

// ─── Write Routes ────────────────────────────────────────────────────────────

// POST /create - Create a new course post
router.post(
  "/create",
  authorization(["admin", "teacher"]),
  validation(postValidation.createCoursePost),
  postController.createCoursePost
);

// PUT /update/:id - Update an existing course post
router.put(
  "/update/:id",
  authorization(["admin", "teacher"]),
  validation(postValidation.updateCoursePost),
  postController.updateCoursePost
);

// PATCH /pin/:id - Toggle pin state of a post
router.patch(
  "/pin/:id",
  authorization(["admin", "teacher"]),
  validation(postValidation.postIdParam),
  postController.togglePinPost
);

// DELETE /delete/:id - Soft delete a course post
router.delete(
  "/delete/:id",
  authorization(["admin", "teacher"]),
  validation(postValidation.postIdParam),
  postController.deleteCoursePost
);

export default router;
