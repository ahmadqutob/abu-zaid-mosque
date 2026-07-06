import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import fileUpload, { fileValidation } from "../../Middleware/multer.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as nextFridayValidation from "./nextFriday.validation.js";
import * as nextFridayController from "./Controller/nextFriday.controller.js";

const router = new Router();

// Create a nextFriday entry (admin & teacher)
router.post("/create",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'image', maxCount: 1 }
    ]),
    validation(nextFridayValidation.createNextFriday),
    nextFridayController.createNextFriday
);

// Get all nextFriday entries
router.get("/all", 
    nextFridayController.getAllNextFridays
);


// Update nextFriday entry (admin & teacher)
router.put("/update/:id",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'image', maxCount: 1 }
    ]),
    validation(nextFridayValidation.updateNextFriday),
    nextFridayController.updateNextFriday
);

// Delete nextFriday entry (admin & teacher)
router.delete("/delete/:id",
    authorization(["admin", "teacher"]),
    validation(nextFridayValidation.nextFridayId),
    nextFridayController.deleteNextFriday
);

export default router;