import { Router } from 'express'
import authorization from "../../Middleware/authorization.middleware.js";
import * as bookingController from "./controller/booking.controller.js";
import validation from '../../Middleware/validation.middleware.js';
import * as validationSchema from './booking.validation.js'
const router = new Router();

// Event hall booking endpoints for Abuzaid Mosque.
// Visitors must sign up first (as "user") before they can submit a booking.
const ALL_AUTH_ROLES = ["admin", "teacher", "student", "user"];

// Submit an event-hall booking request (any authenticated role)
router.post(
  "/createBooking",
  authorization(ALL_AUTH_ROLES),
  validation(validationSchema.createBooking),
  bookingController.createBooking
);

// Update an existing booking (owner or admin)
router.put(
  "/updateBooking/:bookingId",
  authorization(ALL_AUTH_ROLES),
  validation(validationSchema.updateBooking),
  bookingController.updateBooking
);

// Delete a booking (owner or admin)
router.delete(
  "/deleteBooking/:bookingId",
  authorization(ALL_AUTH_ROLES),
  validation(validationSchema.deleteBooking),
  bookingController.deleteBooking
);

// Staff (admin + teacher) can approve / cancel any booking
const STAFF_ROLES = ["admin", "teacher"];

router.patch(
  "/cancelBooking/:bookingId",
  authorization(STAFF_ROLES),
  validation(validationSchema.adminCancelBooking),
  bookingController.adminCancelBooking
);

router.patch(
  "/changeStatus/:bookingId",
  authorization(STAFF_ROLES),
  validation(validationSchema.adminChangeStatus),
  bookingController.adminChangeStatus
);

// Staff: list all bookings
router.get(
  "/all",
  authorization(STAFF_ROLES),
  validation(validationSchema.getAllBookings),
  bookingController.getAllBookings
);

export default router;