import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import fileUpload, { fileValidation } from "../../Middleware/multer.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as eventValidation from "./event.validation.js";
import * as eventController from "./Controller/event.controller.js";

const router = new Router();

// Create a new event (admin & teacher)
router.post("/create",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'image', maxCount: 1 }
    ]),
    validation(eventValidation.createEvent),
    eventController.createEvent
);

// Get all events
router.get("/all", 
    eventController.getAllEvents
);

// Update event (admin & teacher)
router.put("/update/:id",
    authorization(["admin", "teacher"]),
    fileUpload(fileValidation.image).fields([
        { name: 'image', maxCount: 1 }
    ]),
    validation(eventValidation.updateEvent),
    eventController.updateEvent
);

// Delete event (admin & teacher)
router.delete("/delete/:id",
    authorization(["admin", "teacher"]),
    validation(eventValidation.eventId),
    eventController.deleteEvent
);

export default router;
