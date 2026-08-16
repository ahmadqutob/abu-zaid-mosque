import { Router } from "express";
import authorization from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as facilityValidation from "./validation.facility.js";
import * as facilityController from "./controller/controller.facility.js";

const router = new Router();

const ALL_ROLES = ["admin", "superAdmin", "teacher", "student", "user"];
const ADMIN_TEACHER_ROLES = ["admin", "superAdmin", "teacher"];

// ── Public / All Roles ────────────────────────────────────────

// Check facility availability for a date range
router.get(
  "/check-availability",
  validation(facilityValidation.checkAvailability),
  facilityController.checkFacilityAvailability
);

// Create a new rent request
router.post(
  "/create",
  authorization(ALL_ROLES),
  validation(facilityValidation.createFacilityRent),
  facilityController.createFacilityRent
);

// ── Admin & Teacher Management ────────────────────────────────

// List all rent requests with pagination, filters & search
router.get(
  "/all",
  authorization(ADMIN_TEACHER_ROLES),
  validation(facilityValidation.getFacilityRents),
  facilityController.getAllFacilityRents
);

// Get details of a specific rent request
router.get(
  "/:id",
  authorization(ALL_ROLES),
  validation(facilityValidation.facilityIdParam),
  facilityController.getFacilityRentById
);

// Update rent details before approval
router.put(
  "/update/:id",
  authorization(ADMIN_TEACHER_ROLES),
  validation(facilityValidation.updateFacilityRent),
  facilityController.updateFacilityRent
);

// Patch request for status (approved, rejected, cancelled, etc.)
router.patch(
  "/:id/status",
  authorization(ADMIN_TEACHER_ROLES),
  validation(facilityValidation.changeStatus),
  facilityController.changeFacilityRentStatus
);

// Mark rent completed
router.patch(
  "/:id/complete",
  authorization(ADMIN_TEACHER_ROLES),
  validation(facilityValidation.facilityIdParam),
  facilityController.markRentCompleted
);

// Delete a rent request
router.delete(
  "/delete/:id",
  authorization(ADMIN_TEACHER_ROLES),
  validation(facilityValidation.facilityIdParam),
  facilityController.deleteFacilityRent
);

// Generate invoice for a rent request
router.get(
  "/:id/invoice",
  authorization(ALL_ROLES),
  validation(facilityValidation.facilityIdParam),
  facilityController.generateInvoice
);

// List all payments for a rent
router.get(
  "/:id/payments",
  authorization(ADMIN_TEACHER_ROLES),
  validation(facilityValidation.facilityIdParam),
  facilityController.listFacilityPayments
);

export default router;
