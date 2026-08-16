import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import fileUpload, { fileValidation, HME } from "../../Middleware/multer.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as successValidation from "./success.validation.js";
import * as successController from "./controller/success.controller.js";

const router = Router();

// ─── Public Routes ───────────────────────────────────────────────────────────

// GET /featured - Get featured success stories for homepage showcase
router.get("/featured", successController.getFeaturedSuccessStories);

// GET /all - List all success stories (with search, filters, pagination)
router.get(
  "/all",
  validation(successValidation.getSuccessStories),
  successController.getAllSuccessStories
);

// GET /:id - Fetch single success story by ID
router.get(
  "/:id",
  validation(successValidation.storyIdParam),
  successController.getSuccessStoryById
);

// ─── Protected Routes (Admin & Teacher) ──────────────────────────────────────

// POST /create - Create a new success story (with image upload)
router.post(
  "/create",
  authorization(["admin", "teacher"]),
  fileUpload(fileValidation.image).fields([{ name: "image", maxCount: 1 }]),
  HME,
  validation(successValidation.createSuccessStory),
  successController.createSuccessStory
);

// PUT /update/:id - Update an existing success story (with optional image update)
router.put(
  "/update/:id",
  authorization(["admin", "teacher"]),
  fileUpload(fileValidation.image).fields([{ name: "image", maxCount: 1 }]),
  HME,
  validation(successValidation.updateSuccessStory),
  successController.updateSuccessStory
);

// PATCH /featured/:id - Toggle featured status
router.patch(
  "/featured/:id",
  authorization(["admin", "teacher"]),
  validation(successValidation.storyIdParam),
  successController.toggleFeaturedStory
);

// DELETE /delete/:id - Soft delete a success story
router.delete(
  "/delete/:id",
  authorization(["admin", "teacher"]),
  validation(successValidation.storyIdParam),
  successController.deleteSuccessStory
);

export default router;
