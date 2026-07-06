import { Router } from "express";
import * as prayerController from "./controller/prayerTimes.controller.js";
import validation from "../../Middleware/validation.middleware.js";
import * as validationSchema from "./prayerTimes.validation.js";

const router = new Router();

router.get(
    "/",
    validation(validationSchema.getPrayerTimes),
    prayerController.getPrayerTimes
);

export default router;
