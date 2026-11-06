import userModel from "../../../../database/Models/user.model.js";
import teacherModel from "../../../../database/Models/teacher.model.js";
import invitationModel from "../../../../database/Models/invitation.model.js";
import { asyncHandler } from "../../../Services/ErrorHandler.services.js";
import { sendEmail } from "../../../Services/SendEmail.services.js";
import crypto from "crypto";

// Create an expiring invitation; the account role changes only after acceptance.
const createRoleInvitation = async ({ email, role, invitedBy }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userModel.findOne({ email: normalizedEmail, deletedAt: null });
  if (!user || !user.confirmEmail) {
    return { ok: false, status: 404, message: "A verified user account with that email was not found" };
  }
  if (user.role !== "user") {
    return { ok: false, status: 409, message: "Only normal user accounts can be invited to a new role" };
  }

  const apiBaseUrl = process.env.API_BASE_URL ||
    (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
  if (!apiBaseUrl) {
    return { ok: false, status: 500, message: "API_BASE_URL must be configured to send invitations" };
  }
  let acceptEndpoint;
  try {
    const parsedApiUrl = new URL(apiBaseUrl);
    const allowedProtocols = process.env.NODE_ENV === "production" ? ["https:"] : ["http:", "https:"];
    if (!allowedProtocols.includes(parsedApiUrl.protocol)) throw new Error("Unsupported URL protocol");
    acceptEndpoint = new URL("/invitations/accept", parsedApiUrl).toString();
  } catch {
    return { ok: false, status: 500, message: "API_BASE_URL is not a valid absolute URL" };
  }

  await invitationModel.updateMany(
    { userId: user._id, role, acceptedAt: null },
    { $set: { acceptedAt: new Date() } }
  );

  const token = crypto.randomBytes(32).toString("hex");
  const invite = await invitationModel.create({
    userId: user._id,
    email: normalizedEmail,
    role,
    invitedBy: invitedBy._id,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  });

  const mosqueName = process.env.MOSQUE_NAME || "Abuzaid Mosque";
  const emailSent = await sendEmail(
    normalizedEmail,
    `Invitation to join ${mosqueName} as ${role}`,
    `<p>You have been invited to join ${mosqueName} as a ${role}.</p><p>To accept, sign in with the invited account, then send an authenticated POST request to:</p><p><code>${acceptEndpoint}</code></p><p>JSON body: <code>{"token":"${token}"}</code></p><p>Use the JWT returned by <code>POST /auth/signin</code> as the Bearer authorization token. This invitation expires in 48 hours. If you did not expect it, ignore this email.</p>`
  );

  if (!emailSent?.success) {
    await invitationModel.deleteOne({ _id: invite._id });
    return { ok: false, status: 502, message: "Could not send invitation email" };
  }

  return { ok: true, user, role };
};

export const adminInviteUser = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  if (role === "superAdmin" && req.user.role !== "superAdmin") {
    return res.status(403).json({ message: "Only a superAdmin can invite another superAdmin" });
  }
  if (role === "admin" && req.user.role !== "superAdmin") {
    return res.status(403).json({ message: "Only a superAdmin can invite an admin" });
  }
  const result = await createRoleInvitation({ email, role, invitedBy: req.user });
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  return res.status(202).json({ success: true, message: `Invitation sent for role: ${role}` });
});

export const teacherInviteStudent = asyncHandler(async (req, res) => {
  const result = await createRoleInvitation({
    email: req.body.email,
    role: "student",
    invitedBy: req.user,
  });
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  return res.status(202).json({ success: true, message: "Student invitation sent" });
});

export const acceptRoleInvitation = asyncHandler(async (req, res) => {
  const tokenHash = crypto.createHash("sha256").update(req.body.token).digest("hex");
  const now = new Date();
  const pendingInvitation = await invitationModel.findOne({
    tokenHash,
    expiresAt: { $gt: now },
    acceptedAt: null,
  });
  if (!pendingInvitation) {
    return res.status(400).json({ message: "Invitation is invalid, expired, or already used" });
  }
  if (String(pendingInvitation.userId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Sign in with the account that received this invitation" });
  }

  const invitation = await invitationModel.findOneAndUpdate(
    { _id: pendingInvitation._id, expiresAt: { $gt: now }, acceptedAt: null },
    { $set: { acceptedAt: now } },
    { new: true }
  );
  if (!invitation) {
    return res.status(400).json({ message: "Invitation is invalid, expired, or already used" });
  }

  const restoreInvitation = () => invitationModel.updateOne(
    { _id: invitation._id, acceptedAt: now },
    { $set: { acceptedAt: null } }
  );
  let user;
  try {
    user = await userModel.findOneAndUpdate(
      { _id: invitation.userId, email: invitation.email, role: "user", confirmEmail: true, deletedAt: null },
      { $set: { role: invitation.role } },
      { new: true }
    );
  } catch (error) {
    await restoreInvitation();
    throw error;
  }
  if (!user) {
    await restoreInvitation();
    return res.status(409).json({ message: "This account is no longer eligible for the invitation" });
  }

  if (invitation.role === "teacher") {
    try {
      await teacherModel.findOneAndUpdate(
        { userId: user._id },
        { $set: { deletedAt: null }, $setOnInsert: { userId: user._id, createdBy: invitation.invitedBy } },
        { upsert: true, new: true }
      );
    } catch (error) {
      await userModel.updateOne({ _id: user._id, role: "teacher" }, { $set: { role: "user" } });
      await restoreInvitation();
      throw error;
    }
  }

  await invitationModel.updateMany(
    { userId: user._id, acceptedAt: null },
    { $set: { acceptedAt: now } }
  );

  return res.status(200).json({
    success: true,
    message: `Invitation accepted. Sign in again to continue as ${invitation.role}.`,
    role: invitation.role,
  });
});

