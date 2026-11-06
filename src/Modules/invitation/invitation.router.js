import { Router } from "express";
import { createRateLimiter } from "../../Services/securityStore.services.js";
import authorization, { ROLES_ALL } from "../../Middleware/authorization.middleware.js";
import validation from "../../Middleware/validation.middleware.js";
import * as invitationController from "./controller/invitation.controller.js";
import * as validationSchema from "./invitation.validation.js";

const router = Router();
const acceptanceLimiter = createRateLimiter("invitation-accept", 15 * 60 * 1000, 5);

// Only the invited, signed-in account can accept a role change.
router.post(
  "/accept",
  acceptanceLimiter,
  authorization(ROLES_ALL),
  validation(validationSchema.acceptInvitation),
  invitationController.acceptRoleInvitation
);

router.post(
  "/admin",
  authorization(["admin", "superAdmin"]),
  validation(validationSchema.adminInvite),
  invitationController.adminInviteUser
);

router.post(
  "/teacher",
  authorization(["teacher"]),
  validation(validationSchema.teacherInvite),
  invitationController.teacherInviteStudent
);

export default router;
