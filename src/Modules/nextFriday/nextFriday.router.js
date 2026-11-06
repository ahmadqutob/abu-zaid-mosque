import { Router } from "express";
import authorization, { ROLES_STAFF } from "../../Middleware/authorization.middleware.js";
import fileUpload, { fileValidation } from "../../Middleware/multer.middleware.js";
import { unlink } from "node:fs/promises";
import * as nextFridayValidation from "./nextFriday.validation.js";
import * as nextFridayController from "./Controller/nextFriday.controller.js";

const router = new Router();

// Validate the actual body and uploaded file, never values supplied via query strings.
const validation = schema => async (req, res, next) => {
    const { image: ignoredImage, id: ignoredId, ...body } = req.body || {};
    const input = { ...body, ...req.params };
    if (req.files?.image?.length) input.image = req.files.image;
    const { error, value } = schema.validate(input, { abortEarly: false, stripUnknown: true });
    if (error) {
        await Promise.all((req.files?.image || []).map(file => unlink(file.path).catch(error => {
            if (error.code !== "ENOENT") console.error("NextFriday validation cleanup failed", error);
        })));
        return res.status(400).json({ message: "ERRORS", errors: error.details.map(detail => detail.message) });
    }
    const { image, id, ...validatedBody } = value;
    req.body = validatedBody;
    return next();
};

// Validate path parameters separately so query/body fields cannot override the ID.
const validateId = (req, res, next) => {
    const { error } = nextFridayValidation.nextFridayId.validate(req.params);
    if (error) return res.status(400).json({ message: "ERRORS", errors: error.details.map(detail => detail.message) });
    return next();
};

// Create a nextFriday entry (staff)
router.post("/create",
    authorization(ROLES_STAFF),
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

router.get("/upcoming", nextFridayController.getUpcomingFriday);


// Update nextFriday entry (staff)
router.put("/update/:id",
    authorization(ROLES_STAFF),
    validateId,
    fileUpload(fileValidation.image).fields([
        { name: 'image', maxCount: 1 }
    ]),
    validation(nextFridayValidation.updateNextFriday),
    nextFridayController.updateNextFriday
);

// Delete nextFriday entry (staff)
router.delete("/delete/:id",
    authorization(ROLES_STAFF),
    validateId,
    nextFridayController.deleteNextFriday
);

export default router;
