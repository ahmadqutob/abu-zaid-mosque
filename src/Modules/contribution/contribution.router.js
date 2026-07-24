import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import fileUpload, { fileValidation } from "../../Middleware/multer.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as contributionValidation from "./contribution.validation.js";
import * as contributionController from "./Controller/contribution.controller.js";

const router = new Router();

// Create a new contribution (admin & teacher)
router.post("/create",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'image', maxCount: 1 }
    ]),
    validation(contributionValidation.createContribution),
    contributionController.createContribution
);

// Get all contributions
router.get("/all",  authorization(["admin", "teacher"]),
    contributionController.getAllContributions
);

// Update contribution (admin & teacher)
router.put("/update/:id",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'image', maxCount: 1 }
    ]),
    validation(contributionValidation.updateContribution),
    contributionController.updateContribution
);

// Delete contribution (admin & teacher)
router.delete("/delete/:id",
    authorization(["admin", "teacher"]),
    validation(contributionValidation.contributionId),
    contributionController.deleteContribution
);

export default router;
