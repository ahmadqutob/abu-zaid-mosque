import { Router } from "express";
import authorization, { ROLES_ALL } from "../../Middleware/authorization.middleware.js";
import fileUpload, { fileValidation } from "../../Middleware/multer.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as postValidation from "./post.validation.js";
import * as postController from "./Controller/Posts.controller.js";

const router = new Router();

// Create a mosque announcement / post with image upload (Admin, SuperAdmin & Teacher)
router.post("/createPost",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'subImage', maxCount: 5 },
    ]),
    validation(postValidation.createPost),
    postController.createPost
);

// Get all posts with filtering (category, pinned, search) and pagination
router.get("/all", 
    validation(postValidation.getPosts),
    postController.getAllPosts
);

// Get posts by category (e.g. friday_sermon, quran_competition, announcement)
router.get("/category/:category", 
    validation(postValidation.getPostsByCategory),
    postController.getPostsByCategory
);
 

// Get single post by ID
router.get("/:id", 
    validation(postValidation.postId),
    postController.getPostById
);

// Update post (Admin, SuperAdmin, Teacher - author/admin ownership checked in controller)
router.put("/:id",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'mainImage', maxCount: 1 },
        { name: 'subImage', maxCount: 5 },
    ]),
    validation(postValidation.updatePost),
    postController.updatePost
);

// Delete post (soft delete) — Admin, SuperAdmin, or Teacher
router.delete("/:id",
    authorization(["admin", "teacher"]),
    validation(postValidation.postId),
    postController.deletePost
);
 
// Pin / Unpin a mosque post to top of feed (Admin & SuperAdmin only)
router.patch("/:id/pin",
    authorization(["admin"]),
    validation(postValidation.postId),
    postController.togglePinPost
);

export default router;